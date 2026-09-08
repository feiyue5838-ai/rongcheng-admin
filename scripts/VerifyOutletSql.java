import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.AbstractWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.rongcheng.seal.service.OutletService;
import org.mockito.Mockito;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/** 用 mock Mapper 驱动 OutletService，抓取真实生成的 SQL，验证 P0-1 / P0-2 的修复。 */
public class VerifyOutletSql {

    static OutletService service;
    static BaseMapper outletMapper;
    static BaseMapper businessTypeMapper;
    static BaseMapper outletBusinessTypeMapper;
    static String lastQuerySql = "";
    static String lastUpdateSet = "";

    static String targetSql(Object w) throws Exception {
        Class<?> c = w.getClass();
        Method m = null;
        while (c != null) {
            try {
                m = c.getDeclaredMethod("getTargetSql");
                break;
            } catch (NoSuchMethodException e) {
                c = c.getSuperclass();
            }
        }
        if (m == null) return "(no getTargetSql)";
        m.setAccessible(true);
        return String.valueOf(m.invoke(w));
    }

    static Map<String, String> q(String... kv) {
        Map<String, String> m = new HashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put(kv[i], kv[i + 1]);
        return m;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    public static void main(String[] args) throws Exception {
        // 预热 MP 表元数据缓存，否则 getTargetSql() 解析 lambda 列时找不到 TableInfo
        org.apache.ibatis.builder.MapperBuilderAssistant assistant =
                new org.apache.ibatis.builder.MapperBuilderAssistant(new MybatisConfiguration(), "");
        TableInfoHelper.initTableInfo(assistant, Class.forName("com.rongcheng.seal.entity.Outlet"));
        TableInfoHelper.initTableInfo(assistant, Class.forName("com.rongcheng.seal.entity.BusinessType"));

        Constructor<?> ctor = null;
        for (Constructor<?> c : OutletService.class.getDeclaredConstructors()) {
            if (ctor == null || c.getParameterCount() > ctor.getParameterCount()) ctor = c;
        }
        Class<?>[] types = ctor.getParameterTypes();
        Object[] mocks = new Object[types.length];
        for (int i = 0; i < types.length; i++) {
            mocks[i] = Mockito.mock(types[i]);
            if ("OutletMapper".equals(types[i].getSimpleName())) outletMapper = (BaseMapper) mocks[i];
            if ("BusinessTypeMapper".equals(types[i].getSimpleName())) businessTypeMapper = (BaseMapper) mocks[i];
            if ("OutletBusinessTypeMapper".equals(types[i].getSimpleName())) outletBusinessTypeMapper = (BaseMapper) mocks[i];
        }
        ctor.setAccessible(true);
        service = (OutletService) ctor.newInstance(mocks);
        System.out.println("OutletService 构造成功，注入依赖数 = " + types.length);

        Mockito.when(outletMapper.selectList(Mockito.any())).thenAnswer(inv -> {
            Object w = inv.getArgument(0);
            if (w instanceof AbstractWrapper) {
                String sql = targetSql(w);
                if (sql.contains("LIMIT")) lastQuerySql = sql;
            }
            return new ArrayList();
        });

        // ---- P0-1: status=all ----
        lastQuerySql = "";
        service.findAll(q("status", "all", "page", "1", "pageSize", "100"));
        String allSql = lastQuerySql;
        System.out.println("\n[status=all]      " + allSql);
        System.out.println((!allSql.matches("(?s).*status\\s+IN\\s*\\(\\s*\\?\\s*,\\s*\\?\\s*\\).*") ? "PASS" : "FAIL")
                + " | status=all 不再叠加 status IN (0,1)");

        // ---- 兼容: 不传 status ----
        lastQuerySql = "";
        service.findAll(q("page", "1", "pageSize", "100"));
        String noneSql = lastQuerySql;
        System.out.println("\n[不传 status]     " + noneSql);
        System.out.println((noneSql.contains("status") ? "PASS" : "FAIL") + " | 不传 status 保持原 IN(0,1) 行为");

        // ---- 显式 status=2 ----
        lastQuerySql = "";
        service.findAll(q("status", "2", "page", "1", "pageSize", "100"));
        System.out.println("\n[status=2]        " + lastQuerySql);

        // ---- P0-2: pageSize=200 钳制 ----
        lastQuerySql = "";
        service.findAll(q("status", "all", "page", "3", "pageSize", "200"));
        String pageSql = lastQuerySql;
        System.out.println("\n[page=3,size=200] " + pageSql);
        System.out.println((pageSql.contains("LIMIT 100 OFFSET 200") ? "PASS" : "FAIL")
                + " | pageSize=200 钳制为 100 且 OFFSET 按钳制值计算");

        // ---- P1-5: 清空类字段必须真正落库（MP NOT_NULL 会吞掉 null）----
        Mockito.when(outletMapper.update(Mockito.any(), Mockito.any())).thenAnswer(inv -> {
            Object w = inv.getArgument(1);
            Class<?> c = w.getClass();
            Method m = null;
            while (c != null) {
                try {
                    m = c.getDeclaredMethod("getSqlSet");
                    break;
                } catch (NoSuchMethodException e) {
                    c = c.getSuperclass();
                }
            }
            m.setAccessible(true);
            lastUpdateSet = String.valueOf(m.invoke(w));
            return 1;
        });
        Map<String, Object> dto = new HashMap<>();
        dto.put("name", "测试网点");
        dto.put("business_license", null);          // 清空营业执照
        dto.put("invoice_taxpayer_type", "");       // 清空纳税人类型
        dto.put("invoice_qualified", 1);
        dto.put("settlementCycle", null);           // 关闭自动结算
        try {
            service.update("00000000-0000-0000-0000-000000000000", dto);
        } catch (Throwable t) {
            System.out.println("(update 后续处理异常，忽略) " + t);
        }
        System.out.println("\n[update SET]     " + lastUpdateSet);
        boolean clearOk = lastUpdateSet.contains("business_license") && lastUpdateSet.contains("settlement_cycle");
        System.out.println((clearOk ? "PASS" : "FAIL") + " | 清空字段进入 SET 子句（不再被 NOT_NULL 策略吞掉）");

        // ---- 新增时能否直接给业务类型（create → linkBusinessTypesByCode → outlet_business_types）----
        System.out.println("\n[mock] businessTypeMapper = " + businessTypeMapper
                + "\n[mock] outletBusinessTypeMapper = " + outletBusinessTypeMapper);
        final int[] selectOneCount = {0};
        Mockito.when(businessTypeMapper.selectOne(Mockito.any())).thenAnswer(inv -> {
            selectOneCount[0]++;
            com.rongcheng.seal.entity.BusinessType bt = new com.rongcheng.seal.entity.BusinessType();
            bt.setId("BT-SEAL");
            bt.setCode("seal");
            bt.setName("刻章");
            return bt;
        });
        // 注意：此处不能用 Mockito.when(...).thenAnswer 挂钩 insert —— 通过 raw BaseMapper 引用
        // stub 的方法与 OutletService 里实际调用的方法不匹配（泛型擦除），改用 invocation 统计。
        final int[] linkCount = {0};
        final java.util.List<String> linkedTypeIds = new ArrayList<>();
        Map<String, Object> createDto = new HashMap<>();
        createDto.put("name", "新履约供应商");
        createDto.put("phone", "13900000000");
        createDto.put("businessTypeIds", java.util.List.of("seal", "newspaper"));
        try {
            service.create(createDto);
        } catch (Throwable t) {
            System.out.println("(create 后续处理异常，忽略) " + t);
        }
        for (org.mockito.invocation.Invocation inv
                : Mockito.mockingDetails(outletBusinessTypeMapper).getInvocations()) {
            if (!"insert".equals(inv.getMethod().getName())) continue;
            Object link = inv.getArgument(0);
            linkCount[0]++;
            linkedTypeIds.add(String.valueOf(link.getClass().getMethod("getBusinessTypeId").invoke(link)));
            System.out.println("[写入] outlet_business_types " + link);
        }
        System.out.println("\n[create 业务类型] selectOne 调用 = " + selectOneCount[0]
                + "，写入 outlet_business_types 次数 = " + linkCount[0]
                + "，businessTypeId = " + linkedTypeIds);
        System.out.println((linkCount[0] == 2 ? "PASS" : "FAIL")
                + " | 新增时按 code 关联业务类型（传 2 个 code → 写 2 条关联）");

        System.out.println("\n---- 完成 ----");
    }
}
