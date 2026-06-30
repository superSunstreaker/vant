import {
  computed,
  watchEffect,
  defineComponent,
  type ExtractPropTypes,
} from 'vue';
import {
  clamp,
  truthProp,
  makeStringProp,
  makeNumberProp,
  makeNumericProp,
  createNamespace,
  BORDER_SURROUND,
  type Numeric,
} from '../utils';

const [name, bem, t] = createNamespace('pagination');

type PageItem = {
  text: Numeric;
  number: number;
  active?: boolean;
};

const makePage = (
  number: number,
  text: Numeric,
  active?: boolean,
): PageItem => ({ number, text, active });

export type PaginationMode = 'simple' | 'multi';

/**
 * @summary Pagination 分页 - 数据量过多时，采用分页的形式将数据分隔，每次只加载一个页面
 * @attr {number} v-model - 当前页码
 * @attr {PaginationMode} mode - 显示模式，可选值为 simple，默认 multi
 * @attr {string} prev-text - 上一页按钮文字，默认 上一页
 * @attr {string} next-text - 下一页按钮文字，默认 下一页
 * @attr {number|string} page-count - 总页数，默认根据页数计算
 * @attr {number|string} total-items - 总记录数，默认 0
 * @attr {number|string} items-per-page - 每页记录数，默认 10
 * @attr {number|string} show-page-size - 显示的页码个数，默认 5
 * @attr {boolean} force-ellipses - 是否显示省略号，默认 false
 * @attr {boolean} show-prev-button - 是否展示上一页按钮，默认 true
 * @attr {boolean} show-next-button - 是否展示下一页按钮，默认 true
 * @slot page - 自定义页码
 * @slot prev-text - 自定义上一页按钮文字
 * @slot next-text - 自定义下一页按钮文字
 * @event change - 页码改变时触发
 */
export const paginationProps = {
  mode: makeStringProp<PaginationMode>('multi'),
  prevText: String,
  nextText: String,
  pageCount: makeNumericProp(0),
  modelValue: makeNumberProp(0),
  totalItems: makeNumericProp(0),
  showPageSize: makeNumericProp(5),
  itemsPerPage: makeNumericProp(10),
  forceEllipses: Boolean,
  showPrevButton: truthProp,
  showNextButton: truthProp,
};

export type PaginationProps = ExtractPropTypes<typeof paginationProps>;

export default defineComponent({
  name,

  props: paginationProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const count = computed(() => {
      const { pageCount, totalItems, itemsPerPage } = props;
      const count = +pageCount || Math.ceil(+totalItems / +itemsPerPage);
      return Math.max(1, count);
    });

    const pages = computed(() => {
      const items: PageItem[] = [];
      const pageCount = count.value;
      const showPageSize = +props.showPageSize;
      const { modelValue, forceEllipses } = props;

      // Default page limits
      let startPage = 1;
      let endPage = pageCount;
      const isMaxSized = showPageSize < pageCount;

      // recompute if showPageSize
      if (isMaxSized) {
        // Current page is displayed in the middle of the visible ones
        startPage = Math.max(modelValue - Math.floor(showPageSize / 2), 1);
        endPage = startPage + showPageSize - 1;

        // Adjust if limit is exceeded
        if (endPage > pageCount) {
          endPage = pageCount;
          startPage = endPage - showPageSize + 1;
        }
      }

      // Add page number links
      for (let number = startPage; number <= endPage; number++) {
        const page = makePage(number, number, number === modelValue);
        items.push(page);
      }

      // Add links to move between page sets
      if (isMaxSized && showPageSize > 0 && forceEllipses) {
        if (startPage > 1) {
          const prevPages = makePage(startPage - 1, '...');
          items.unshift(prevPages);
        }

        if (endPage < pageCount) {
          const nextPages = makePage(endPage + 1, '...');
          items.push(nextPages);
        }
      }

      return items;
    });

    const updateModelValue = (value: number, emitChange?: boolean) => {
      value = clamp(value, 1, count.value);

      if (props.modelValue !== value) {
        emit('update:modelValue', value);

        if (emitChange) {
          emit('change', value);
        }
      }
    };

    // format modelValue
    watchEffect(() => updateModelValue(props.modelValue));

    const renderDesc = () => (
      <li class={bem('page-desc')}>
        {slots.pageDesc
          ? slots.pageDesc()
          : `${props.modelValue}/${count.value}`}
      </li>
    );

    const renderPrevButton = () => {
      const { mode, modelValue, showPrevButton } = props;

      if (!showPrevButton) {
        return;
      }

      const slot = slots['prev-text'];
      const disabled = modelValue === 1;
      return (
        <li
          class={[
            bem('item', { disabled, border: mode === 'simple', prev: true }),
            BORDER_SURROUND,
          ]}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => updateModelValue(modelValue - 1, true)}
          >
            {slot ? slot() : props.prevText || t('prev')}
          </button>
        </li>
      );
    };

    const renderNextButton = () => {
      const { mode, modelValue, showNextButton } = props;

      if (!showNextButton) {
        return;
      }

      const slot = slots['next-text'];
      const disabled = modelValue === count.value;
      return (
        <li
          class={[
            bem('item', { disabled, border: mode === 'simple', next: true }),
            BORDER_SURROUND,
          ]}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => updateModelValue(modelValue + 1, true)}
          >
            {slot ? slot() : props.nextText || t('next')}
          </button>
        </li>
      );
    };

    const renderPages = () =>
      pages.value.map((page) => (
        <li
          class={[
            bem('item', { active: page.active, page: true }),
            BORDER_SURROUND,
          ]}
        >
          <button
            type="button"
            aria-current={page.active || undefined}
            onClick={() => updateModelValue(page.number, true)}
          >
            {slots.page ? slots.page(page) : page.text}
          </button>
        </li>
      ));

    return () => (
      <nav role="navigation" class={bem()}>
        <ul class={bem('items')}>
          {renderPrevButton()}
          {props.mode === 'simple' ? renderDesc() : renderPages()}
          {renderNextButton()}
        </ul>
      </nav>
    );
  },
});
