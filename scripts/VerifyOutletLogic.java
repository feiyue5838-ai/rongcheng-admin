import java.lang.reflect.Method;

/** 直接反射调用 OutletService 的私有静态方法，验证 P0-1 哨兵与状态文案逻辑（无需数据库）。 */
public class VerifyOutletLogic {
    static int pass = 0, fail = 0;

    static Object call(String name, Class<?>[] types, Object... args) throws Exception {
        Method m = Class.forName("com.rongcheng.seal.service.OutletService")
                .getDeclaredMethod(name, types);
        m.setAccessible(true);
        return m.invoke(null, args);
    }

    static void check(String label, Object actual, Object expect) {
        boolean ok = String.valueOf(actual).equals(String.valueOf(expect));
        System.out.println((ok ? "PASS" : "FAIL") + " | " + label + " => " + actual + (ok ? "" : " (期望 " + expect + ")"));
        if (ok) pass++; else fail++;
    }

    public static void main(String[] args) throws Exception {
        Class<?> svc = Class.forName("com.rongcheng.seal.service.OutletService");
        System.out.println("已加载 OutletService: " + svc.getName());

        // P0-1: status=all 哨兵解析（大小写不敏感）
        check("isAllStatus(all)", call("isAllStatus", new Class[]{String.class}, "all"), true);
        check("isAllStatus(ALL)", call("isAllStatus", new Class[]{String.class}, "ALL"), true);
        check("isAllStatus(All)", call("isAllStatus", new Class[]{String.class}, "All"), true);
        check("isAllStatus(null)", call("isAllStatus", new Class[]{String.class}, (Object) null), false);
        check("isAllStatus(\"\")", call("isAllStatus", new Class[]{String.class}, ""), false);
        check("isAllStatus(1)", call("isAllStatus", new Class[]{String.class}, "1"), false);

        // statusText: 2/3/4/5 不应再全部显示「已歇业」
        check("statusText(0)", call("outletStatusText", new Class[]{Integer.class}, 0), "已歇业");
        check("statusText(1)", call("outletStatusText", new Class[]{Integer.class}, 1), "营业中");
        check("statusText(2)", call("outletStatusText", new Class[]{Integer.class}, 2), "合作中");
        check("statusText(3)", call("outletStatusText", new Class[]{Integer.class}, 3), "审核中");
        check("statusText(4)", call("outletStatusText", new Class[]{Integer.class}, 4), "已暂停");
        check("statusText(5)", call("outletStatusText", new Class[]{Integer.class}, 5), "已终止");
        check("statusText(null)", call("outletStatusText", new Class[]{Integer.class}, (Object) null), "未知");

        System.out.println("---- 结果: PASS=" + pass + " FAIL=" + fail + " ----");
    }
}
