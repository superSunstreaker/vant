import {
  computed,
  ref,
  onMounted,
  defineComponent,
  watch,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  inBrowser,
  makeNumberProp,
  makeStringProp,
  createNamespace,
  preventDefault,
  windowWidth,
} from '../utils';

// Composables
import { useRect } from '@vant/use';
import { useExpose } from '../composables/use-expose';

// Components
import { Button } from '../button';

// Types
import type { SignatureExpose } from './types';

const [name, bem, t] = createNamespace('signature');

/**
 * @summary Signature 签名 - 用于签名场景的组件，基于 Canvas 实现
 * @attr {string} type - 导出图片类型，默认 png
 * @attr {string} pen-color - 笔触颜色，默认 #000
 * @attr {number} line-width - 线条宽度，默认 3
 * @attr {number} history-size - 撤销历史记录最大数量，默认 20
 * @attr {string} background-color - 背景颜色
 * @attr {string} tips - 当不支持 Canvas 的时候出现的提示文案
 * @attr {string} clear-button-text - 清除按钮文案，默认 清空
 * @attr {string} undo-button-text - 撤销按钮文案，默认 撤销
 * @attr {string} confirm-button-text - 确认按钮文案，默认 确认
 * @slot tips - 自定义提示文案
 * @event start - 开始签名时触发
 * @event end - 结束签名时触发
 * @event signing - 签名过程中触发，参数：event: TouchEvent
 * @event submit - 点击确定按钮时触发，参数：data: { image: string, canvas: HTMLCanvasElement }
 * @event clear - 点击取消按钮时触发
 */
export const signatureProps = {
  tips: String,
  type: makeStringProp('png'),
  penColor: makeStringProp('#000'),
  lineWidth: makeNumberProp(3),
  historySize: makeNumberProp(20),
  undoButtonText: String,
  clearButtonText: String,
  backgroundColor: makeStringProp(''),
  confirmButtonText: String,
};

export type SignatureProps = ExtractPropTypes<typeof signatureProps>;

const hasCanvasSupport = () => {
  const canvas = document.createElement('canvas');
  return !!canvas.getContext?.('2d');
};

export default defineComponent({
  name,

  props: signatureProps,

  emits: ['submit', 'clear', 'start', 'end', 'signing'],

  setup(props, { emit, slots }) {
    const canvasRef = ref<HTMLCanvasElement>();
    const wrapRef = ref<HTMLElement>();
    const ctx = computed(() => {
      if (!canvasRef.value) return null;
      return canvasRef.value.getContext('2d');
    });
    const isRenderCanvas = inBrowser ? hasCanvasSupport() : true;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let canvasRect: DOMRect;

    const history = ref<ImageData[]>([]);

    const saveState = () => {
      if (ctx.value && canvasWidth && canvasHeight) {
        if (history.value.length >= props.historySize) {
          history.value.shift();
        }
        history.value.push(
          ctx.value.getImageData(0, 0, canvasWidth, canvasHeight),
        );
      }
    };

    const touchStart = () => {
      if (!ctx.value) {
        return false;
      }

      ctx.value.beginPath();
      ctx.value.lineWidth = props.lineWidth;
      ctx.value.strokeStyle = props.penColor;
      canvasRect = useRect(canvasRef);

      emit('start');
    };

    const touchMove = (event: TouchEvent) => {
      if (!ctx.value) {
        return false;
      }

      preventDefault(event);

      const touch = event.touches[0];
      const mouseX = touch.clientX - (canvasRect?.left || 0);
      const mouseY = touch.clientY - (canvasRect?.top || 0);

      ctx.value.lineCap = 'round';
      ctx.value.lineJoin = 'round';
      ctx.value.lineTo(mouseX, mouseY);
      ctx.value.stroke();

      emit('signing', event);
    };

    const touchEnd = (event: TouchEvent) => {
      preventDefault(event);
      saveState();
      emit('end');
    };

    const isCanvasEmpty = (canvas: HTMLCanvasElement) => {
      const empty = document.createElement('canvas');
      empty.width = canvas.width;
      empty.height = canvas.height;
      if (props.backgroundColor) {
        const emptyCtx = empty.getContext('2d');
        setCanvasBgColor(emptyCtx);
      }
      return canvas.toDataURL() === empty.toDataURL();
    };

    const setCanvasBgColor = (
      ctx: CanvasRenderingContext2D | null | undefined,
    ) => {
      if (ctx && props.backgroundColor) {
        ctx.fillStyle = props.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    };

    const submit = () => {
      const canvas = canvasRef.value;
      if (!canvas) {
        return;
      }

      const isEmpty = isCanvasEmpty(canvas);

      const image: string = isEmpty
        ? ''
        : (
            {
              jpg: (): string => canvas.toDataURL('image/jpeg', 0.8),
              jpeg: (): string => canvas.toDataURL('image/jpeg', 0.8),
            }[props.type] as () => string
          )?.() || canvas.toDataURL(`image/${props.type}`);

      emit('submit', {
        image,
        canvas,
      });
    };

    const clear = () => {
      if (ctx.value) {
        ctx.value.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.value.closePath();
        setCanvasBgColor(ctx.value);
      }
      history.value = [];
      emit('clear');
    };

    const undo = () => {
      if (history.value.length) {
        history.value.pop();
        if (ctx.value) {
          ctx.value.clearRect(0, 0, canvasWidth, canvasHeight);
          setCanvasBgColor(ctx.value);
          if (history.value.length) {
            ctx.value.putImageData(
              history.value[history.value.length - 1],
              0,
              0,
            );
          }
        }
      }
    };

    const initialize = () => {
      if (isRenderCanvas && canvasRef.value) {
        const canvas = canvasRef.value;
        const dpr = inBrowser ? window.devicePixelRatio : 1;

        canvasWidth = canvas.width = (wrapRef.value?.offsetWidth || 0) * dpr;
        canvasHeight = canvas.height = (wrapRef.value?.offsetHeight || 0) * dpr;
        ctx.value?.scale(dpr, dpr);
        setCanvasBgColor(ctx.value);
      }
    };

    const resize = () => {
      if (ctx.value) {
        const data = ctx.value.getImageData(0, 0, canvasWidth, canvasHeight);
        initialize();
        ctx.value.putImageData(data, 0, 0);
      }
    };

    watch(windowWidth, resize);

    onMounted(initialize);

    useExpose<SignatureExpose>({
      resize,
      clear,
      submit,
      undo,
    });

    return () => (
      <div class={bem()}>
        <div class={bem('content')} ref={wrapRef}>
          {isRenderCanvas ? (
            <canvas
              ref={canvasRef}
              onTouchstartPassive={touchStart}
              onTouchmove={touchMove}
              onTouchend={touchEnd}
            />
          ) : slots.tips ? (
            slots.tips()
          ) : (
            <p>{props.tips}</p>
          )}
        </div>
        <div class={bem('footer')}>
          <Button size="small" onClick={clear}>
            {props.clearButtonText || t('clear')}
          </Button>
          <Button size="small" onClick={undo}>
            {props.undoButtonText || t('undo')}
          </Button>
          <Button type="primary" size="small" onClick={submit}>
            {props.confirmButtonText || t('confirm')}
          </Button>
        </div>
      </div>
    );
  },
});
