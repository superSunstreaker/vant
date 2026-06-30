import {
  ref,
  watch,
  computed,
  nextTick,
  defineComponent,
  type ExtractPropTypes,
} from 'vue';

// Utils
import { cellSharedProps } from '../cell/Cell';
import {
  pick,
  extend,
  truthProp,
  numericProp,
  createNamespace,
} from '../utils';
import { COLLAPSE_KEY } from '../collapse/Collapse';

// Composables
import { raf, doubleRaf, useParent } from '@vant/use';
import { useExpose } from '../composables/use-expose';
import { useLazyRender } from '../composables/use-lazy-render';

// Components
import { Cell } from '../cell';

const [name, bem] = createNamespace('collapse-item');

const CELL_SLOTS = ['icon', 'title', 'value', 'label', 'right-icon'] as const;

/**
 * @summary CollapseItem 折叠面板项 - 用于放置在 Collapse 中的单个折叠面板
 * @attr {number|string} name - 唯一标识符，默认为索引值
 * @attr {string} icon - 标题栏左侧图标名称或图片链接
 * @attr {string} size - 标题栏大小，可选值为 large
 * @attr {number|string} title - 标题栏左侧内容
 * @attr {number|string} value - 标题栏右侧内容
 * @attr {number|string} label - 标题栏描述信息
 * @attr {boolean} border - 是否显示内边框，默认 true
 * @attr {boolean} is-link - 是否展示标题栏右侧箭头并开启点击反馈，默认 true
 * @attr {boolean} disabled - 是否禁用面板，默认 false
 * @attr {boolean} readonly - 是否为只读状态，只读状态下无法操作面板，默认 false
 * @attr {boolean} lazy-render - 是否在首次展开时才渲染面板内容，默认 true
 * @slot default - 面板内容
 * @slot title - 自定义标题栏左侧内容
 * @slot value - 自定义标题栏右侧内容
 * @slot label - 自定义标题栏描述信息
 * @slot icon - 自定义标题栏左侧图标
 * @slot right-icon - 自定义标题栏右侧图标
 */
export const collapseItemProps = extend({}, cellSharedProps, {
  name: numericProp,
  isLink: truthProp,
  disabled: Boolean,
  readonly: Boolean,
  lazyRender: truthProp,
});

export type CollapseItemProps = ExtractPropTypes<typeof collapseItemProps>;

export default defineComponent({
  name,

  props: collapseItemProps,

  setup(props, { slots }) {
    const wrapperRef = ref<HTMLElement>();
    const contentRef = ref<HTMLElement>();
    const { parent, index } = useParent(COLLAPSE_KEY);

    if (!parent) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          '[Vant] <CollapseItem> must be a child component of <Collapse>.',
        );
      }
      return;
    }

    const name = computed(() => props.name ?? index.value);
    const expanded = computed(() => parent.isExpanded(name.value));

    const show = ref(expanded.value);
    const lazyRender = useLazyRender(() => show.value || !props.lazyRender);

    const onTransitionEnd = () => {
      if (!expanded.value) {
        show.value = false;
      } else if (wrapperRef.value) {
        wrapperRef.value.style.height = '';
      }
    };

    watch(expanded, (value, oldValue) => {
      if (oldValue === null) {
        return;
      }

      if (value) {
        show.value = true;
      }

      // Use raf: flick when opened in safari
      // Use nextTick: closing animation failed when set `user-select: none`
      const tick = value ? nextTick : raf;

      tick(() => {
        if (!contentRef.value || !wrapperRef.value) {
          return;
        }

        const { offsetHeight } = contentRef.value;
        if (offsetHeight) {
          const contentHeight = `${offsetHeight}px`;
          wrapperRef.value.style.height = value ? '0' : contentHeight;

          // use double raf to ensure animation can start
          doubleRaf(() => {
            if (wrapperRef.value) {
              wrapperRef.value.style.height = value ? contentHeight : '0';
            }
          });
        } else {
          onTransitionEnd();
        }
      });
    });

    const toggle = (newValue = !expanded.value) => {
      parent.toggle(name.value, newValue);
    };

    const onClickTitle = () => {
      if (!props.disabled && !props.readonly) {
        toggle();
      }
    };

    const renderTitle = () => {
      const { border, disabled, readonly } = props;
      const attrs = pick(
        props,
        Object.keys(cellSharedProps) as Array<keyof typeof cellSharedProps>,
      );

      if (readonly) {
        attrs.isLink = false;
      }
      if (disabled || readonly) {
        attrs.clickable = false;
      }

      return (
        <Cell
          v-slots={pick(slots, CELL_SLOTS)}
          role="button"
          class={bem('title', {
            disabled,
            expanded: expanded.value,
            borderless: !border,
          })}
          aria-expanded={String(expanded.value)}
          onClick={onClickTitle}
          {...attrs}
        />
      );
    };

    const renderContent = lazyRender(() => (
      <div
        v-show={show.value}
        ref={wrapperRef}
        class={bem('wrapper')}
        onTransitionend={onTransitionEnd}
      >
        <div ref={contentRef} class={bem('content')}>
          {slots.default?.()}
        </div>
      </div>
    ));

    useExpose({ toggle, expanded, itemName: name });

    return () => (
      <div class={[bem({ border: index.value && props.border })]}>
        {renderTitle()}
        {renderContent()}
      </div>
    );
  },
});
