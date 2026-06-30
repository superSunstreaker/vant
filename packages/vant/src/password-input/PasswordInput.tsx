import { defineComponent, type ExtractPropTypes } from 'vue';
import {
  addUnit,
  truthProp,
  numericProp,
  BORDER_LEFT,
  makeStringProp,
  BORDER_SURROUND,
  createNamespace,
  makeNumericProp,
} from '../utils';

const [name, bem] = createNamespace('password-input');

/**
 * @summary PasswordInput 密码输入框 - 带网格的输入框组件，可以用于输入密码、短信验证码等场景，通常与数字键盘组件配合使用
 * @attr {string} value - 密码值，默认 ''
 * @attr {string} info - 输入框下方文字提示
 * @attr {string} error-info - 输入框下方错误提示
 * @attr {number|string} length - 密码最大长度，默认 6
 * @attr {number|string} gutter - 输入框格子之间的间距，默认单位为 px，默认 0
 * @attr {boolean} mask - 是否隐藏密码内容，默认 true
 * @attr {boolean} focused - 是否已聚焦，聚焦时会显示光标，默认 false
 * @event focus - 输入框聚焦时触发
 */
export const passwordInputProps = {
  info: String,
  mask: truthProp,
  value: makeStringProp(''),
  gutter: numericProp,
  length: makeNumericProp(6),
  focused: Boolean,
  errorInfo: String,
};

export type PasswordInputProps = ExtractPropTypes<typeof passwordInputProps>;

export default defineComponent({
  name,

  props: passwordInputProps,

  emits: ['focus'],

  setup(props, { emit }) {
    const onTouchStart = (event: TouchEvent) => {
      event.stopPropagation();
      emit('focus', event);
    };

    const renderPoints = () => {
      const Points: JSX.Element[] = [];
      const { mask, value, gutter, focused } = props;
      const length = +props.length;

      for (let i = 0; i < length; i++) {
        const char = value[i];
        const showBorder = i !== 0 && !gutter;
        const showCursor = focused && i === value.length;

        let style;
        if (i !== 0 && gutter) {
          style = { marginLeft: addUnit(gutter) };
        }

        Points.push(
          <li
            class={[
              { [BORDER_LEFT]: showBorder },
              bem('item', { focus: showCursor }),
            ]}
            style={style}
          >
            {mask ? (
              <i style={{ visibility: char ? 'visible' : 'hidden' }} />
            ) : (
              char
            )}
            {showCursor && <div class={bem('cursor')} />}
          </li>,
        );
      }

      return Points;
    };

    return () => {
      const info = props.errorInfo || props.info;
      return (
        <div class={bem()}>
          <ul
            class={[bem('security'), { [BORDER_SURROUND]: !props.gutter }]}
            onTouchstartPassive={onTouchStart}
          >
            {renderPoints()}
          </ul>
          {info && (
            <div class={bem(props.errorInfo ? 'error-info' : 'info')}>
              {info}
            </div>
          )}
        </div>
      );
    };
  },
});
