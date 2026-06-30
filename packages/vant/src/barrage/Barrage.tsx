import {
  defineComponent,
  onMounted,
  ref,
  type ExtractPropTypes,
  nextTick,
  watch,
} from 'vue';
import { useExpose } from '../composables/use-expose';
import {
  createNamespace,
  makeArrayProp,
  makeNumberProp,
  makeNumericProp,
  truthProp,
} from '../utils';
import { BarrageExpose } from './types';

export interface BarrageItem {
  id: string | number;
  text: string | number;
}

/**
 * @summary Barrage 弹幕 - 实现观看视频时弹出的评论性字幕功能
 * @attr {BarrageItem[]} v-model - 弹幕数据
 * @attr {boolean} auto-play - 是否自动播放弹幕，默认 true
 * @attr {number|string} rows - 弹幕文字行数，默认 4
 * @attr {number|string} top - 弹幕文字区域顶部间距，单位 px，默认 10
 * @attr {number|string} duration - 弹幕文字滑过容器的时间，单位 ms，默认 4000
 * @attr {number} delay - 弹幕动画延时，单位 ms，默认 300
 * @slot default - 弹幕组件子元素
 */
export const barrageProps = {
  top: makeNumericProp(10),
  rows: makeNumericProp(4),
  duration: makeNumericProp(4000),
  autoPlay: truthProp,
  delay: makeNumberProp(300),
  modelValue: makeArrayProp<BarrageItem>(),
};

export type BarrageProps = ExtractPropTypes<typeof barrageProps>;

const [name, bem] = createNamespace('barrage');

export default defineComponent({
  name,

  props: barrageProps,

  emits: ['update:modelValue'],

  setup(props, { emit, slots }) {
    const barrageWrapper = ref<HTMLDivElement>();
    const className = bem('item') as string;
    const total = ref(0);
    const barrageItems: HTMLSpanElement[] = [];

    const createBarrageItem = (
      text: string | number,
      delay: number = props.delay,
    ) => {
      const item = document.createElement('span');
      item.className = className;
      item.innerText = String(text);

      item.style.animationDuration = `${props.duration}ms`;
      item.style.animationDelay = `${delay}ms`;
      item.style.animationName = 'van-barrage';
      item.style.animationTimingFunction = 'linear';

      return item;
    };

    const isInitBarrage = ref(true);
    const isPlay = ref(props.autoPlay);

    const appendBarrageItem = ({ id, text }: BarrageItem, i: number) => {
      const item = createBarrageItem(
        text,
        isInitBarrage.value ? i * props.delay : undefined,
      );
      if (!props.autoPlay && isPlay.value === false) {
        item.style.animationPlayState = 'paused';
      }
      barrageWrapper.value?.append(item);
      total.value++;

      const top =
        ((total.value - 1) % +props.rows) * item.offsetHeight + +props.top;
      item.style.top = `${top}px`;
      item.dataset.id = String(id);
      barrageItems.push(item);

      item.addEventListener('animationend', () => {
        emit(
          'update:modelValue',
          [...props.modelValue].filter((v) => String(v.id) !== item.dataset.id),
        );
      });
    };

    const updateBarrages = (
      newValue: BarrageItem[],
      oldValue: BarrageItem[],
    ) => {
      const map = new Map(oldValue.map((item) => [item.id, item]));

      newValue.forEach((item, i) => {
        if (map.has(item.id)) {
          map.delete(item.id);
        } else {
          // add
          appendBarrageItem(item, i);
        }
      });

      map.forEach((item) => {
        // remove
        const index = barrageItems.findIndex(
          (span) => span.dataset.id === String(item.id),
        );
        if (index > -1) {
          barrageItems[index].remove();
          barrageItems.splice(index, 1);
        }
      });

      isInitBarrage.value = false;
    };

    watch(
      () => props.modelValue.slice(),
      (newValue, oldValue) => updateBarrages(newValue ?? [], oldValue ?? []),
      { deep: true },
    );

    const rootStyle = ref<{
      '--move-distance'?: string;
    }>({});

    onMounted(async () => {
      rootStyle.value['--move-distance'] =
        `-${barrageWrapper.value?.offsetWidth}px`;
      await nextTick();
      updateBarrages(props.modelValue, []);
    });

    const play = () => {
      isPlay.value = true;
      barrageItems.forEach((item) => {
        item.style.animationPlayState = 'running';
      });
    };

    const pause = () => {
      isPlay.value = false;
      barrageItems.forEach((item) => {
        item.style.animationPlayState = 'paused';
      });
    };

    useExpose<BarrageExpose>({
      play,
      pause,
    });

    return () => (
      <div class={bem()} ref={barrageWrapper} style={rootStyle.value}>
        {slots.default?.()}
      </div>
    );
  },
});
