declare module '@wangeditor/editor-for-vue' {
  import type { DefineComponent } from 'vue'
  import type {
    IDomEditor,
    IEditorConfig,
    IToolbarConfig,
    SlateDescendant,
  } from '@wangeditor/editor'

  type EditorMode = 'default' | 'simple'

  interface EditorComponentProps {
    modelValue?: string
    defaultContent?: SlateDescendant[]
    defaultHtml?: string
    defaultConfig?: Partial<IEditorConfig>
    mode?: EditorMode
    'onUpdate:modelValue'?: (value: string) => void
    onOnCreated?: (editor: IDomEditor) => void
  }

  interface ToolbarComponentProps {
    editor?: IDomEditor | null
    defaultConfig?: Partial<IToolbarConfig>
    mode?: EditorMode
  }

  export const Editor: DefineComponent<EditorComponentProps>
  export const Toolbar: DefineComponent<ToolbarComponentProps>
}
