import {
  ref,
  watch,
  computed,
  nextTick,
  onUpdated,
  onMounted,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  isHidden,
  truthProp,
  makeStringProp,
  makeNumericProp,
  createNamespace,
} from '../utils';

// Composables
import { useRect, useScrollParent, useEventListener } from '@vant/use';
import { useExpose } from '../composables/use-expose';
import { useAllTabStatus } from '../composables/use-tab-status';

// Components
import { Loading } from '../loading';

// Types
import type { ListExpose, ListDirection } from './types';

const [name, bem, t] = createNamespace('list');

/**
 * @summary List 列表 - 瀑布流滚动加载，用于展示长列表，当列表即将滚动到底部时，会触发事件并加载更多列表项
 * @attr {boolean} v-model:loading - 是否处于加载状态，加载过程中不触发 load 事件，默认 false
 * @attr {boolean} v-model:error - 是否加载失败，加载失败后点击错误提示可以重新触发 load 事件，默认 false
 * @attr {boolean} finished - 是否已加载完成，加载完成后不再触发 load 事件，默认 false
 * @attr {number|string} offset - 滚动条与底部距离小于 offset 时触发 load 事件，默认 300
 * @attr {string} loading-text - 加载过程中的提示文案
 * @attr {string} finished-text - 加载完成后的提示文案
 * @attr {string} error-text - 加载失败后的提示文案
 * @attr {boolean} immediate-check - 是否在初始化时立即执行滚动位置检查，默认 true
 * @attr {boolean} disabled - 是否禁用滚动加载，默认 false
 * @attr {ListDirection} direction - 滚动触发加载的方向，可选值为 up，默认 down
 * @attr {Element} scroller - 指定需要监听滚动事件的节点，默认为最近的父级滚动节点
 * @slot default - 列表内容
 * @slot loading - 自定义底部加载中提示
 * @slot finished - 自定义加载完成后的提示文案
 * @slot error - 自定义加载失败后的提示文案
 * @event load - 滚动条与底部距离小于 offset 时触发
 */
export const listProps = {
  error: Boolean,
  offset: makeNumericProp(300),
  loading: Boolean,
  disabled: Boolean,
  finished: Boolean,
  scroller: Object as PropType<Element>,
  errorText: String,
  direction: makeStringProp<ListDirection>('down'),
  loadingText: {
    type: String as PropType<string | null>,
    default: '',
  },
  finishedText: String,
  immediateCheck: truthProp,
};

export type ListProps = ExtractPropTypes<typeof listProps>;

export default defineComponent({
  name,

  props: listProps,

  emits: ['load', 'update:error', 'update:loading'],

  setup(props, { emit, slots }) {
    // use sync innerLoading state to avoid repeated loading in some edge cases
    const loading = ref(props.loading);
    const root = ref<HTMLElement>();
    const placeholder = ref<HTMLElement>();
    const tabStatus = useAllTabStatus();
    const scrollParent = useScrollParent(root);
    const scroller = computed(() => props.scroller || scrollParent.value);

    const check = () => {
      nextTick(() => {
        if (
          loading.value ||
          props.finished ||
          props.disabled ||
          props.error ||
          // skip check when inside an inactive tab
          tabStatus?.value === false
        ) {
          return;
        }

        const { direction } = props;
        const offset = +props.offset;
        const scrollParentRect = useRect(scroller);

        if (!scrollParentRect.height || isHidden(root)) {
          return;
        }

        let isReachEdge = false;
        const placeholderRect = useRect(placeholder);

        if (direction === 'up') {
          isReachEdge = scrollParentRect.top - placeholderRect.top <= offset;
        } else {
          isReachEdge =
            placeholderRect.bottom - scrollParentRect.bottom <= offset;
        }

        if (isReachEdge) {
          loading.value = true;
          emit('update:loading', true);
          emit('load');
        }
      });
    };

    const renderFinishedText = () => {
      if (props.finished) {
        const text = slots.finished ? slots.finished() : props.finishedText;
        if (text) {
          return <div class={bem('finished-text')}>{text}</div>;
        }
      }
    };

    const clickErrorText = () => {
      emit('update:error', false);
      check();
    };

    const renderErrorText = () => {
      if (props.error) {
        const text = slots.error ? slots.error() : props.errorText;
        if (text) {
          return (
            <div
              role="button"
              class={bem('error-text')}
              tabindex={0}
              onClick={clickErrorText}
            >
              {text}
            </div>
          );
        }
      }
    };

    const renderLoading = () => {
      if (loading.value && !props.finished && !props.disabled) {
        return (
          <div class={bem('loading')}>
            {slots.loading
              ? slots.loading()
              : props.loadingText != null && (
                  <Loading class={bem('loading-icon')}>
                    {props.loadingText || t('loading')}
                  </Loading>
                )}
          </div>
        );
      }
    };

    watch(() => [props.loading, props.finished, props.error], check);

    if (tabStatus) {
      watch(tabStatus, (tabActive) => {
        if (tabActive) {
          check();
        }
      });
    }

    onUpdated(() => {
      loading.value = props.loading!;
    });

    onMounted(() => {
      if (props.immediateCheck) {
        check();
      }
    });

    useExpose<ListExpose>({ check });

    useEventListener('scroll', check, {
      target: scroller,
      passive: true,
    });

    return () => {
      const Content = slots.default?.();
      const Placeholder = <div ref={placeholder} class={bem('placeholder')} />;

      return (
        <div ref={root} role="feed" class={bem()} aria-busy={loading.value}>
          {props.direction === 'down' ? Content : Placeholder}
          {renderLoading()}
          {renderFinishedText()}
          {renderErrorText()}
          {props.direction === 'up' ? Content : Placeholder}
        </div>
      );
    };
  },
});
