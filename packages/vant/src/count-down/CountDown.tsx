import { watch, computed, defineComponent, type ExtractPropTypes } from 'vue';

// Utils
import {
  truthProp,
  makeStringProp,
  makeNumericProp,
  createNamespace,
} from '../utils';
import { parseFormat } from './utils';

// Composables
import { useCountDown } from '@vant/use';
import { useExpose } from '../composables/use-expose';

const [name, bem] = createNamespace('count-down');

/**
 * @summary CountDown 倒计时 - 用于实时展示倒计时数值，支持毫秒精度
 * @attr {number|string} time - 倒计时时长，单位毫秒，默认 0
 * @attr {string} format - 时间格式，默认 HH:mm:ss
 * @attr {boolean} auto-start - 是否自动开始倒计时，默认 true
 * @attr {boolean} millisecond - 是否开启毫秒级渲染，默认 false
 * @slot default - 自定义内容
 * @event finish - 倒计时结束时触发
 * @event change - 倒计时变化时触发，参数：currentTime: CurrentTime
 */
export const countDownProps = {
  time: makeNumericProp(0),
  format: makeStringProp('HH:mm:ss'),
  autoStart: truthProp,
  millisecond: Boolean,
};

export type CountDownProps = ExtractPropTypes<typeof countDownProps>;

export default defineComponent({
  name,

  props: countDownProps,

  emits: ['change', 'finish'],

  setup(props, { emit, slots }) {
    const { start, pause, reset, current } = useCountDown({
      time: +props.time,
      millisecond: props.millisecond,
      onChange: (current) => emit('change', current),
      onFinish: () => emit('finish'),
    });

    const timeText = computed(() => parseFormat(props.format, current.value));

    const resetTime = () => {
      reset(+props.time);

      if (props.autoStart) {
        start();
      }
    };

    watch(() => props.time, resetTime, { immediate: true });

    useExpose({
      start,
      pause,
      reset: resetTime,
    });

    return () => (
      <div role="timer" class={bem()}>
        {slots.default ? slots.default(current.value) : timeText.value}
      </div>
    );
  },
});
