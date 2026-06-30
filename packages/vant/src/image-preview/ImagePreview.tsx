import {
  ref,
  watch,
  nextTick,
  reactive,
  onMounted,
  defineComponent,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
  type TeleportProps,
} from 'vue';

// Utils
import {
  pick,
  truthProp,
  unknownProp,
  Interceptor,
  windowWidth,
  windowHeight,
  makeArrayProp,
  makeStringProp,
  makeNumericProp,
  callInterceptor,
  createNamespace,
  HAPTICS_FEEDBACK,
} from '../utils';

// Composables
import { useRect } from '@vant/use';
import { useExpose } from '../composables/use-expose';

// Components
import { Icon } from '../icon';
import { Swipe, SwipeInstance, SwipeToOptions } from '../swipe';
import { Popup, PopupCloseIconPosition } from '../popup';
import ImagePreviewItem from './ImagePreviewItem';

// Types
import {
  ImagePreviewScaleEventParams,
  ImagePreviewItemInstance,
} from './types';

const [name, bem] = createNamespace('image-preview');

const popupProps = [
  'show',
  'teleport',
  'transition',
  'overlayStyle',
  'closeOnPopstate',
] as const;

/**
 * @summary ImagePreview 图片预览 - 图片放大预览，支持组件调用和函数调用两种方式
 * @attr {boolean} show - 是否显示图片预览，默认 false
 * @attr {boolean} loop - 是否开启循环播放，默认 true
 * @attr {string[]} images - 需要预览的图片 URL 数组，默认 []
 * @attr {number|string} min-zoom - 最小缩放比例，默认 1/3
 * @attr {number|string} max-zoom - 最大缩放比例，默认 3
 * @attr {boolean} vertical - 是否垂直滑动，默认 false
 * @attr {boolean} closeable - 是否显示关闭图标，默认 false
 * @attr {string} close-icon - 关闭图标名称或图片链接，默认 clear
 * @attr {PopupCloseIconPosition} close-icon-position - 关闭图标位置，默认 top-right
 * @attr {string} transition - 动画类名
 * @attr {number|string} swipe-duration - 动画时长，单位 ms，默认 300
 * @attr {number|string} start-position - 图片初始位置索引，默认 0
 * @attr {boolean} show-index - 是否显示页码，默认 true
 * @attr {boolean} show-indicators - 是否显示指示器，默认 false
 * @attr {boolean} close-on-click-image - 是否在点击图片后关闭，默认 true
 * @attr {boolean} close-on-click-overlay - 是否在点击遮罩层后关闭，默认 true
 * @attr {boolean} close-on-popstate - 是否在页面回退时自动关闭，默认 true
 * @attr {string|Element} teleport - 指定挂载的节点
 * @attr {Function} before-close - 关闭前的回调函数
 * @slot index - 自定义页码内容
 * @slot cover - 自定义覆盖在图片预览上方的内容
 * @slot image - 自定义图片内容
 * @event scale - 缩放图片时触发
 * @event close - 关闭时触发，参数：{ index, url }
 * @event closed - 关闭且动画结束后触发
 * @event change - 切换图片时触发，参数：index: number
 * @event long-press - 长按图片时触发，参数：{ index }
 */
export const imagePreviewProps = {
  show: Boolean,
  loop: truthProp,
  images: makeArrayProp<string>(),
  minZoom: makeNumericProp(1 / 3),
  maxZoom: makeNumericProp(3),
  overlay: truthProp,
  vertical: Boolean,
  closeable: Boolean,
  showIndex: truthProp,
  className: unknownProp,
  closeIcon: makeStringProp('clear'),
  transition: String,
  beforeClose: Function as PropType<Interceptor>,
  doubleScale: truthProp,
  overlayClass: unknownProp,
  overlayStyle: Object as PropType<CSSProperties>,
  swipeDuration: makeNumericProp(300),
  startPosition: makeNumericProp(0),
  showIndicators: Boolean,
  closeOnPopstate: truthProp,
  closeOnClickImage: truthProp,
  closeOnClickOverlay: truthProp,
  closeIconPosition: makeStringProp<PopupCloseIconPosition>('top-right'),
  teleport: [String, Object] as PropType<TeleportProps['to']>,
};

export type ImagePreviewProps = ExtractPropTypes<typeof imagePreviewProps>;

export default defineComponent({
  name,

  props: imagePreviewProps,

  emits: ['scale', 'close', 'closed', 'change', 'longPress', 'update:show'],

  setup(props, { emit, slots }) {
    const swipeRef = ref<SwipeInstance>();
    const activedPreviewItemRef = ref<ImagePreviewItemInstance>();

    const state = reactive({
      active: 0,
      rootWidth: 0,
      rootHeight: 0,
      disableZoom: false,
    });

    const resize = () => {
      if (swipeRef.value) {
        const rect = useRect(swipeRef.value.$el);
        state.rootWidth = rect.width;
        state.rootHeight = rect.height;
        swipeRef.value.resize();
      }
    };

    const emitScale = (args: ImagePreviewScaleEventParams) =>
      emit('scale', args);

    const updateShow = (show: boolean) => emit('update:show', show);

    const emitClose = () => {
      callInterceptor(props.beforeClose, {
        args: [state.active],
        done: () => updateShow(false),
      });
    };

    const setActive = (active: number) => {
      if (active !== state.active) {
        state.active = active;
        emit('change', active);
      }
    };

    const renderIndex = () => {
      if (props.showIndex) {
        return (
          <div class={bem('index')}>
            {slots.index
              ? slots.index({ index: state.active })
              : `${state.active + 1} / ${props.images.length}`}
          </div>
        );
      }
    };

    const renderCover = () => {
      if (slots.cover) {
        return <div class={bem('cover')}>{slots.cover()}</div>;
      }
    };

    const onDragStart = () => {
      state.disableZoom = true;
    };

    const onDragEnd = () => {
      state.disableZoom = false;
    };

    const renderImages = () => (
      <Swipe
        ref={swipeRef}
        lazyRender
        loop={props.loop}
        class={bem('swipe')}
        vertical={props.vertical}
        duration={props.swipeDuration}
        initialSwipe={props.startPosition}
        showIndicators={props.showIndicators}
        indicatorColor="white"
        onChange={setActive}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
      >
        {props.images.map((image, index) => (
          <ImagePreviewItem
            v-slots={{
              image: slots.image,
            }}
            ref={(item) => {
              if (index === state.active) {
                activedPreviewItemRef.value = item as ImagePreviewItemInstance;
              }
            }}
            src={image}
            show={props.show}
            active={state.active}
            maxZoom={props.maxZoom}
            minZoom={props.minZoom}
            rootWidth={state.rootWidth}
            rootHeight={state.rootHeight}
            disableZoom={state.disableZoom}
            doubleScale={props.doubleScale}
            closeOnClickImage={props.closeOnClickImage}
            closeOnClickOverlay={props.closeOnClickOverlay}
            vertical={props.vertical}
            onScale={emitScale}
            onClose={emitClose}
            onLongPress={() => emit('longPress', { index })}
          />
        ))}
      </Swipe>
    );

    const renderClose = () => {
      if (props.closeable) {
        return (
          <Icon
            role="button"
            name={props.closeIcon}
            class={[
              bem('close-icon', props.closeIconPosition),
              HAPTICS_FEEDBACK,
            ]}
            onClick={emitClose}
          />
        );
      }
    };

    const onClosed = () => emit('closed');

    const prev = () => swipeRef.value?.prev();

    const next = () => swipeRef.value?.next();

    const swipeTo = (index: number, options?: SwipeToOptions) =>
      swipeRef.value?.swipeTo(index, options);

    useExpose({
      resetScale: () => {
        activedPreviewItemRef.value?.resetScale();
      },
      swipeTo,
      prev,
      next,
    });

    onMounted(resize);

    watch([windowWidth, windowHeight], resize);

    watch(
      () => props.startPosition,
      (value) => setActive(+value),
    );

    watch(
      () => props.show,
      (value) => {
        const { images, startPosition } = props;
        if (value) {
          setActive(+startPosition);
          nextTick(() => {
            resize();
            swipeTo(+startPosition, { immediate: true });
          });
        } else {
          emit('close', {
            index: state.active,
            url: images[state.active],
          });
        }
      },
    );

    return () => (
      <Popup
        class={[bem(), props.className]}
        overlayClass={[bem('overlay'), props.overlayClass]}
        onClosed={onClosed}
        onUpdate:show={updateShow}
        {...pick(props, popupProps)}
      >
        {renderClose()}
        {renderImages()}
        {renderIndex()}
        {renderCover()}
      </Popup>
    );
  },
});
