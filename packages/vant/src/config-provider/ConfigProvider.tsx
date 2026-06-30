import {
  watch,
  provide,
  computed,
  watchEffect,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  defineComponent,
  type PropType,
  type InjectionKey,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';
import {
  extend,
  inBrowser,
  kebabCase,
  makeStringProp,
  createNamespace,
  type Numeric,
} from '../utils';
import { setGlobalZIndex } from '../composables/use-global-z-index';

const [name, bem] = createNamespace('config-provider');

export type ConfigProviderTheme = 'light' | 'dark';

export type ConfigProviderThemeVarsScope = 'local' | 'global';

export type ConfigProviderProvide = {
  iconPrefix?: string;
};

export const CONFIG_PROVIDER_KEY: InjectionKey<ConfigProviderProvide> =
  Symbol(name);

export type ThemeVars = PropType<Record<string, Numeric>>;

/**
 * @summary ConfigProvider 全局配置 - 用于全局配置 Vant 组件，提供深色模式、主题定制等能力
 * @attr {ConfigProviderTheme} theme - 主题风格，设置为 dark 来开启深色模式，全局生效，默认 light
 * @attr {object} theme-vars - 自定义主题变量，局部生效
 * @attr {object} theme-vars-dark - 仅在深色模式下生效的主题变量，优先级高于 theme-vars
 * @attr {object} theme-vars-light - 仅在浅色模式下生效的主题变量，优先级高于 theme-vars
 * @attr {ConfigProviderThemeVarsScope} theme-vars-scope - CSS 变量生效范围，设置为 global 整个页面生效，默认 local
 * @attr {string} tag - 根节点对应的 HTML 标签名，默认 div
 * @attr {number} z-index - 设置所有弹窗类组件的 z-index，该属性对全局生效，默认 2000
 * @attr {string} icon-prefix - 所有图标的类名前缀，默认 van-icon
 * @slot default - 默认插槽，包裹需要全局配置的子组件
 */
export const configProviderProps = {
  tag: makeStringProp<keyof HTMLElementTagNameMap>('div'),
  theme: makeStringProp<ConfigProviderTheme>('light'),
  zIndex: Number,
  themeVars: Object as ThemeVars,
  themeVarsDark: Object as ThemeVars,
  themeVarsLight: Object as ThemeVars,
  themeVarsScope: makeStringProp<ConfigProviderThemeVarsScope>('local'),
  iconPrefix: String,
};

export type ConfigProviderProps = ExtractPropTypes<typeof configProviderProps>;

/** map `gray1` to `gray-1` */
function insertDash(str: string) {
  return str.replace(/([a-zA-Z])(\d)/g, '$1-$2');
}

function mapThemeVarsToCSSVars(themeVars: Record<string, Numeric>) {
  const cssVars: Record<string, Numeric> = {};
  Object.keys(themeVars).forEach((key) => {
    const formattedKey = insertDash(kebabCase(key));
    cssVars[`--van-${formattedKey}`] = themeVars[key];
  });
  return cssVars;
}

function syncThemeVarsOnRoot(
  newStyle: Record<string, Numeric> = {},
  oldStyle: Record<string, Numeric> = {},
) {
  Object.keys(newStyle).forEach((key) => {
    if (newStyle[key] !== oldStyle[key]) {
      document.documentElement.style.setProperty(key, newStyle[key] as string);
    }
  });
  Object.keys(oldStyle).forEach((key) => {
    if (!newStyle[key]) {
      document.documentElement.style.removeProperty(key);
    }
  });
}

export default defineComponent({
  name,

  props: configProviderProps,

  setup(props, { slots }) {
    const style = computed<CSSProperties | undefined>(() =>
      mapThemeVarsToCSSVars(
        extend(
          {},
          props.themeVars,
          props.theme === 'dark' ? props.themeVarsDark : props.themeVarsLight,
        ),
      ),
    );

    if (inBrowser) {
      const addTheme = () => {
        document.documentElement.classList.add(`van-theme-${props.theme}`);
      };
      const removeTheme = (theme = props.theme) => {
        document.documentElement.classList.remove(`van-theme-${theme}`);
      };

      watch(
        () => props.theme,
        (newVal, oldVal) => {
          if (oldVal) {
            removeTheme(oldVal);
          }
          addTheme();
        },
        { immediate: true },
      );

      onActivated(addTheme);
      onDeactivated(removeTheme);
      onBeforeUnmount(removeTheme);

      watch(style, (newStyle, oldStyle) => {
        if (props.themeVarsScope === 'global') {
          syncThemeVarsOnRoot(
            newStyle as Record<string, Numeric>,
            oldStyle as Record<string, Numeric>,
          );
        }
      });

      watch(
        () => props.themeVarsScope,
        (newScope, oldScope) => {
          if (oldScope === 'global') {
            // remove on Root
            syncThemeVarsOnRoot({}, style.value as Record<string, Numeric>);
          }
          if (newScope === 'global') {
            // add on root
            syncThemeVarsOnRoot(style.value as Record<string, Numeric>, {});
          }
        },
      );

      if (props.themeVarsScope === 'global') {
        // add on root
        syncThemeVarsOnRoot(style.value as Record<string, Numeric>, {});
      }
    }

    provide(CONFIG_PROVIDER_KEY, props);

    watchEffect(() => {
      if (props.zIndex !== undefined) {
        setGlobalZIndex(props.zIndex);
      }
    });

    return () => (
      <props.tag
        class={bem()}
        style={props.themeVarsScope === 'local' ? style.value : undefined}
      >
        {slots.default?.()}
      </props.tag>
    );
  },
});
