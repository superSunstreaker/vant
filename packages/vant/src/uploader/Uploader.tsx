import {
  ref,
  reactive,
  defineComponent,
  onBeforeUnmount,
  type PropType,
  type ExtractPropTypes,
  nextTick,
} from 'vue';

// Utils
import {
  pick,
  extend,
  toArray,
  isPromise,
  truthProp,
  Interceptor,
  getSizeStyle,
  makeArrayProp,
  makeStringProp,
  makeNumericProp,
  type Numeric,
  type ComponentInstance,
} from '../utils';
import {
  bem,
  name,
  isOversize,
  filterFiles,
  isImageFile,
  readFileContent,
} from './utils';

// Composables
import { useCustomFieldValue } from '@vant/use';
import { useExpose } from '../composables/use-expose';

// Components
import { Icon } from '../icon';
import { showImagePreview, type ImagePreviewOptions } from '../image-preview';
import UploaderPreviewItem from './UploaderPreviewItem';

// Types
import type { ImageFit } from '../image';
import type {
  UploaderExpose,
  UploaderMaxSize,
  UploaderAfterRead,
  UploaderBeforeRead,
  UploaderResultType,
  UploaderFileListItem,
} from './types';

/**
 * @summary Uploader 文件上传 - 用于将本地的图片或文件上传至服务器，并在上传过程中展示预览图和上传进度
 * @attr {UploaderFileListItem[]} v-model - 已上传的文件列表
 * @attr {string} accept - 允许上传的文件类型，默认 image/*
 * @attr {number|string} name - 标识符，通常为一个唯一的字符串或数字，可以在回调函数的第二项参数中获取
 * @attr {number|string|Array} preview-size - 预览图和上传区域的尺寸，默认单位为 px，默认 80px
 * @attr {boolean} preview-image - 是否在上传完成后展示预览图，默认 true
 * @attr {boolean} preview-full-image - 是否在点击预览图后展示全屏图片预览，默认 true
 * @attr {object} preview-options - 全屏图片预览的配置项，可选值见 ImagePreview
 * @attr {boolean} multiple - 是否开启图片多选，默认 false
 * @attr {boolean} disabled - 是否禁用文件上传，默认 false
 * @attr {boolean} readonly - 是否将上传区域设置为只读状态，默认 false
 * @attr {boolean} deletable - 是否展示删除按钮，默认 true
 * @attr {boolean} reupload - 是否开启覆盖上传，开启后会关闭图片预览，默认 false
 * @attr {boolean} show-upload - 是否展示上传区域，默认 true
 * @attr {boolean} lazy-load - 是否开启图片懒加载，须配合 Lazyload 组件使用，默认 false
 * @attr {string} capture - 图片选取模式，可选值为 camera
 * @attr {Function} after-read - 文件读取完成后的回调函数
 * @attr {Function} before-read - 文件读取前的回调函数，返回 false 可终止文件读取，支持返回 Promise
 * @attr {Function} before-delete - 文件删除前的回调函数，返回 false 可终止文件删除，支持返回 Promise
 * @attr {number|string|Function} max-size - 文件大小限制，单位为 byte，默认 Infinity
 * @attr {number|string} max-count - 文件上传数量限制，默认 Infinity
 * @attr {string} result-type - 文件读取结果类型，可选值为 file / text，默认 dataUrl
 * @attr {string} upload-text - 上传区域文字提示
 * @attr {string} image-fit - 预览图裁剪模式，默认 cover
 * @attr {string} upload-icon - 上传区域图标名称或图片链接，默认 photograph
 * @slot default - 自定义上传区域
 * @slot preview-delete - 自定义删除按钮
 * @slot preview-cover - 自定义覆盖在预览区域上方的内容
 * @event oversize - 文件大小超过限制时触发
 * @event click-upload - 点击上传区域时触发，参数：event: MouseEvent
 * @event click-preview - 点击预览图时触发
 * @event click-reupload - 点击覆盖上传时触发
 * @event close-preview - 关闭全屏图片预览时触发
 * @event delete - 删除文件预览时触发
 */
export const uploaderProps = {
  name: makeNumericProp(''),
  accept: makeStringProp('image/*'),
  capture: String,
  multiple: Boolean,
  disabled: Boolean,
  readonly: Boolean,
  lazyLoad: Boolean,
  maxCount: makeNumericProp(Infinity),
  imageFit: makeStringProp<ImageFit>('cover'),
  resultType: makeStringProp<UploaderResultType>('dataUrl'),
  uploadIcon: makeStringProp('photograph'),
  uploadText: String,
  deletable: truthProp,
  reupload: Boolean,
  afterRead: Function as PropType<UploaderAfterRead>,
  showUpload: truthProp,
  modelValue: makeArrayProp<UploaderFileListItem>(),
  beforeRead: Function as PropType<UploaderBeforeRead>,
  beforeDelete: Function as PropType<Interceptor>,
  previewSize: [Number, String, Array] as PropType<
    Numeric | [Numeric, Numeric]
  >,
  previewImage: truthProp,
  previewOptions: Object as PropType<Partial<ImagePreviewOptions>>,
  previewFullImage: truthProp,
  maxSize: {
    type: [Number, String, Function] as PropType<UploaderMaxSize>,
    default: Infinity,
  },
};

export type UploaderProps = ExtractPropTypes<typeof uploaderProps>;

export default defineComponent({
  name,

  props: uploaderProps,

  emits: [
    'delete',
    'oversize',
    'clickUpload',
    'closePreview',
    'clickPreview',
    'clickReupload',
    'update:modelValue',
  ],

  setup(props, { emit, slots }) {
    const inputRef = ref();
    const urls: string[] = [];
    const reuploadIndex = ref(-1);
    const isReuploading = ref(false);

    const getDetail = (index = props.modelValue.length) => ({
      name: props.name,
      index,
    });

    const resetInput = () => {
      if (inputRef.value) {
        inputRef.value.value = '';
      }
    };

    const onAfterRead = (
      items: UploaderFileListItem | UploaderFileListItem[],
    ) => {
      resetInput();

      if (isOversize(items, props.maxSize)) {
        if (Array.isArray(items)) {
          const result = filterFiles(items, props.maxSize);
          items = result.valid;
          emit('oversize', result.invalid, getDetail());

          if (!items.length) {
            return;
          }
        } else {
          emit('oversize', items, getDetail());
          return;
        }
      }
      items = reactive(items);
      if (reuploadIndex.value > -1) {
        const arr = [...props.modelValue];
        arr.splice(reuploadIndex.value, 1, items as UploaderFileListItem);
        emit('update:modelValue', arr);
        reuploadIndex.value = -1;
      } else {
        emit('update:modelValue', [...props.modelValue, ...toArray(items)]);
      }

      if (props.afterRead) {
        props.afterRead(items, getDetail());
      }
    };

    const readFile = (files: File | File[]) => {
      const { maxCount, modelValue, resultType } = props;

      if (Array.isArray(files)) {
        const remainCount = +maxCount - modelValue.length;

        if (files.length > remainCount) {
          files = files.slice(0, remainCount);
        }

        Promise.all(
          files.map((file) => readFileContent(file, resultType)),
        ).then((contents) => {
          const fileList = (files as File[]).map((file, index) => {
            const result: UploaderFileListItem = {
              file,
              status: '',
              message: '',
              objectUrl: URL.createObjectURL(file),
            };

            if (contents[index]) {
              result.content = contents[index] as string;
            }

            return result;
          });

          onAfterRead(fileList);
        });
      } else {
        readFileContent(files, resultType).then((content) => {
          const result: UploaderFileListItem = {
            file: files as File,
            status: '',
            message: '',
            objectUrl: URL.createObjectURL(files as File),
          };

          if (content) {
            result.content = content;
          }

          onAfterRead(result);
        });
      }
    };

    const onChange = (event: Event) => {
      const { files } = event.target as HTMLInputElement;

      if (props.disabled || !files || !files.length) {
        return;
      }

      const file =
        files.length === 1 ? files[0] : ([].slice.call(files) as File[]);

      if (props.beforeRead) {
        const response = props.beforeRead(file, getDetail());

        if (!response) {
          resetInput();
          return;
        }

        if (isPromise(response)) {
          response
            .then((data) => {
              if (data) {
                readFile(data);
              } else {
                readFile(file);
              }
            })
            .catch(resetInput);
          return;
        }
      }

      readFile(file);
    };

    let imagePreview: ComponentInstance | undefined;

    const onClosePreview = () => emit('closePreview');

    const previewImage = (item: UploaderFileListItem) => {
      if (props.previewFullImage) {
        const imageFiles = props.modelValue.filter(isImageFile);
        const images = imageFiles
          .map((item) => {
            if (item.objectUrl && !item.url && item.status !== 'failed') {
              item.url = item.objectUrl;
              urls.push(item.url);
            }
            return item.url;
          })
          .filter(Boolean) as string[];

        imagePreview = showImagePreview(
          extend(
            {
              images,
              startPosition: imageFiles.indexOf(item),
              onClose: onClosePreview,
            },
            props.previewOptions,
          ),
        );
      }
    };

    const closeImagePreview = () => {
      if (imagePreview) {
        imagePreview.close();
      }
    };

    const deleteFile = (item: UploaderFileListItem, index: number) => {
      const fileList = props.modelValue.slice(0);
      fileList.splice(index, 1);

      emit('update:modelValue', fileList);
      emit('delete', item, getDetail(index));
    };

    const reuploadFile = (index: number) => {
      isReuploading.value = true;
      reuploadIndex.value = index;
      nextTick(() => chooseFile());
    };

    const onInputClick = () => {
      if (!isReuploading.value) {
        reuploadIndex.value = -1;
      }
      isReuploading.value = false;
    };

    const renderPreviewItem = (item: UploaderFileListItem, index: number) => {
      const needPickData = [
        'imageFit',
        'deletable',
        'reupload',
        'previewSize',
        'beforeDelete',
      ] as const;

      const previewData = extend(
        pick(props, needPickData),
        pick(item, needPickData, true),
      );

      return (
        <UploaderPreviewItem
          v-slots={pick(slots, ['preview-cover', 'preview-delete'])}
          item={item}
          index={index}
          onClick={() =>
            emit(
              props.reupload ? 'clickReupload' : 'clickPreview',
              item,
              getDetail(index),
            )
          }
          onDelete={() => deleteFile(item, index)}
          onPreview={() => previewImage(item)}
          onReupload={() => reuploadFile(index)}
          {...pick(props, ['name', 'lazyLoad'])}
          {...previewData}
        />
      );
    };

    const renderPreviewList = () => {
      if (props.previewImage) {
        return props.modelValue.map(renderPreviewItem);
      }
    };

    const onClickUpload = (event: MouseEvent) => emit('clickUpload', event);

    const renderUpload = () => {
      const lessThanMax = props.modelValue.length < +props.maxCount;

      const Input = props.readonly ? null : (
        <input
          ref={inputRef}
          type="file"
          class={bem('input')}
          accept={props.accept}
          capture={props.capture as unknown as boolean}
          multiple={props.multiple && reuploadIndex.value === -1}
          disabled={props.disabled}
          onChange={onChange}
          onClick={onInputClick}
        />
      );

      if (slots.default) {
        return (
          <div
            v-show={lessThanMax}
            class={bem('input-wrapper')}
            onClick={onClickUpload}
          >
            {slots.default()}
            {Input}
          </div>
        );
      }

      return (
        <div
          v-show={props.showUpload && lessThanMax}
          class={bem('upload', { readonly: props.readonly })}
          style={getSizeStyle(props.previewSize)}
          onClick={onClickUpload}
        >
          <Icon name={props.uploadIcon} class={bem('upload-icon')} />
          {props.uploadText && (
            <span class={bem('upload-text')}>{props.uploadText}</span>
          )}
          {Input}
        </div>
      );
    };

    const chooseFile = () => {
      if (inputRef.value && !props.disabled) {
        inputRef.value.click();
      }
    };

    onBeforeUnmount(() => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    });

    useExpose<UploaderExpose>({
      chooseFile,
      reuploadFile,
      closeImagePreview,
    });
    useCustomFieldValue(() => props.modelValue);

    return () => (
      <div class={bem()}>
        <div class={bem('wrapper', { disabled: props.disabled })}>
          {renderPreviewList()}
          {renderUpload()}
        </div>
      </div>
    );
  },
});
