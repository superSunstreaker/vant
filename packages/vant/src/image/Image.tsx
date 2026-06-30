import {
  ref,
  watch,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  defineComponent,
  getCurrentInstance,
  type Slot,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
  type ImgHTMLAttributes,
} from 'vue';

// Utils
import {
  isDef,
  addUnit,
  inBrowser,
  truthProp,
  numericProp,
  makeStringProp,
  createNamespace,
} from '../utils';

// Components
import { Icon } from '../icon';

const [name, bem] = createNamespace('image');

// Types
import type { ImageFit, ImagePosition } from './types';

/**
 * @summary Image 图片 - 增强版的 img 标签，提供多种图片填充模式，支持图片懒加载、加载中提示、加载失败提示
 * @attr {string} src - 图片链接
 * @attr {ImageFit} fit - 图片填充模式，等同于原生的 object-fit 属性，默认 fill
 * @attr {ImagePosition} position - 图片位置，等同于原生的 object-position 属性，默认 center
 * @attr {string} alt - 替代文本
 * @attr {number|string} width - 宽度，默认单位为 px
 * @attr {number|string} height - 高度，默认单位为 px
 * @attr {number|string} radius - 圆角大小，默认单位为 px，默认 0
 * @attr {boolean} round - 是否显示为圆形，默认 false
 * @attr {boolean} block - 是否将根节点设置为块级元素，默认 false
 * @attr {boolean} lazy-load - 是否开启图片懒加载，须配合 Lazyload 组件使用，默认 false
 * @attr {boolean} show-error - 是否展示图片加载失败提示，默认 true
 * @attr {boolean} show-loading - 是否展示图片加载中提示，默认 true
 * @attr {string} error-icon - 失败时提示的图标名称或图片链接，默认 photo-fail
 * @attr {string} loading-icon - 加载时提示的图标名称或图片链接，默认 photo
 * @attr {number|string} icon-size - 加载图标和失败图标的大小，默认 32px
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {string} crossorigin - 等同于原生的 crossorigin 属性
 * @attr {string} referrerpolicy - 等同于原生的 referrerpolicy 属性
 * @attr {string} decoding - 等同于原生的 decoding 属性
 * @slot default - 自定义图片下方的内容
 * @slot loading - 自定义加载中的提示内容
 * @slot error - 自定义加载失败时的提示内容
 * @event load - 图片加载完毕时触发，参数：event: Event
 * @event error - 图片加载失败时触发
 */
export const imageProps = {
  src: String,
  alt: String,
  fit: String as PropType<ImageFit>,
  position: String as PropType<ImagePosition>,
  round: Boolean,
  block: Boolean,
  width: numericProp,
  height: numericProp,
  radius: numericProp,
  lazyLoad: Boolean,
  iconSize: numericProp,
  showError: truthProp,
  errorIcon: makeStringProp('photo-fail'),
  iconPrefix: String,
  showLoading: truthProp,
  loadingIcon: makeStringProp('photo'),
  crossorigin: String as PropType<ImgHTMLAttributes['crossorigin']>,
  referrerpolicy: String as PropType<ImgHTMLAttributes['referrerpolicy']>,
  decoding: String as PropType<ImgHTMLAttributes['decoding']>,
};

export type ImageProps = ExtractPropTypes<typeof imageProps>;

export default defineComponent({
  name,

  props: imageProps,

  emits: ['load', 'error'],

  setup(props, { emit, slots }) {
    const error = ref(false);
    const loading = ref(true);
    const imageRef = ref<HTMLImageElement>();

    const { $Lazyload } = getCurrentInstance()!.proxy!;

    const style = computed(() => {
      const style: CSSProperties = {
        width: addUnit(props.width),
        height: addUnit(props.height),
      };

      if (isDef(props.radius)) {
        style.overflow = 'hidden';
        style.borderRadius = addUnit(props.radius);
      }

      return style;
    });

    watch(
      () => props.src,
      () => {
        error.value = false;
        loading.value = true;
      },
    );

    const onLoad = (event: Event) => {
      if (loading.value) {
        loading.value = false;
        emit('load', event);
      }
    };

    const triggerLoad = () => {
      const loadEvent = new Event('load');
      Object.defineProperty(loadEvent, 'target', {
        value: imageRef.value,
        enumerable: true,
      });
      onLoad(loadEvent);
    };

    const onError = (event?: Event) => {
      error.value = true;
      loading.value = false;
      emit('error', event);
    };

    const renderIcon = (name: string, className: unknown, slot?: Slot) => {
      if (slot) {
        return slot();
      }
      return (
        <Icon
          name={name}
          size={props.iconSize}
          class={className}
          classPrefix={props.iconPrefix}
        />
      );
    };

    const renderPlaceholder = () => {
      if (loading.value && props.showLoading) {
        return (
          <div class={bem('loading')}>
            {renderIcon(props.loadingIcon, bem('loading-icon'), slots.loading)}
          </div>
        );
      }
      if (error.value && props.showError) {
        return (
          <div class={bem('error')}>
            {renderIcon(props.errorIcon, bem('error-icon'), slots.error)}
          </div>
        );
      }
    };

    const renderImage = () => {
      if (error.value || !props.src) {
        return;
      }

      const attrs = {
        alt: props.alt,
        class: bem('img'),
        decoding: props.decoding,
        style: {
          objectFit: props.fit,
          objectPosition: props.position,
        },
        crossorigin: props.crossorigin,
        referrerpolicy: props.referrerpolicy,
      };

      if (props.lazyLoad) {
        return <img ref={imageRef} v-lazy={props.src} {...attrs} />;
      }

      return (
        <img
          ref={imageRef}
          src={props.src}
          onLoad={onLoad}
          onError={onError}
          {...attrs}
        />
      );
    };

    const onLazyLoaded = ({ el }: { el: HTMLElement }) => {
      const check = () => {
        if (el === imageRef.value && loading.value) {
          triggerLoad();
        }
      };
      if (imageRef.value) {
        check();
      } else {
        // LazyLoad may trigger loaded event before Image mounted
        // https://github.com/vant-ui/vant/issues/10046
        nextTick(check);
      }
    };

    const onLazyLoadError = ({ el }: { el: HTMLElement }) => {
      if (el === imageRef.value && !error.value) {
        onError();
      }
    };

    if ($Lazyload && inBrowser) {
      $Lazyload.$on('loaded', onLazyLoaded);
      $Lazyload.$on('error', onLazyLoadError);

      onBeforeUnmount(() => {
        $Lazyload.$off('loaded', onLazyLoaded);
        $Lazyload.$off('error', onLazyLoadError);
      });
    }

    // In nuxt3, the image may not trigger load event,
    // so the initial complete state should be checked.
    // https://github.com/youzan/vant/issues/11335
    onMounted(() => {
      nextTick(() => {
        if (imageRef.value?.complete && !props.lazyLoad) {
          triggerLoad();
        }
      });
    });

    return () => (
      <div
        class={bem({ round: props.round, block: props.block })}
        style={style.value}
      >
        {renderImage()}
        {renderPlaceholder()}
        {slots.default?.()}
      </div>
    );
  },
});
