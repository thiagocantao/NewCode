<template>
    <div
        class="ww-avatar"
        :style="avatarStyle"
        :title="nameValue"
        role="button"
        tabindex="0"
        :aria-label="nameValue || 'Avatar'"
        @click="openFilePicker"
        @keydown.enter.prevent="openFilePicker"
        @keydown.space.prevent="openFilePicker"
    >
        <img v-if="hasDisplayImage" :src="displayImage" class="ww-avatar__image" :alt="nameValue || 'Avatar'" />
        <span v-else class="ww-avatar__initial">{{ initialLetter }}</span>

        <input
            ref="fileInput"
            class="ww-avatar__input"
            type="file"
            accept="image/*"
            @change="handleFileChange"
        />
    </div>
</template>

<script>
import { computed, onBeforeUnmount, ref } from 'vue';

export default {
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
    },
    emits: ['trigger-event'],
    setup(props, { emit }) {
        const fileInput = ref(null);
        const selectedImageUrl = ref('');

        const nameValue = computed(() => {
            const value = props.content?.NameValue ?? props.content?.nameValue ?? '';
            return String(value).trim();
        });
        const initialValue = computed(() => {
            const value = props.content?.initialValue ?? props.content?.InitialValue;
            return typeof value === 'string' ? value.trim() : '';
        });

        const displayImage = computed(() => selectedImageUrl.value || initialValue.value);
        const hasDisplayImage = computed(() => Boolean(displayImage.value));
        const initialLetter = computed(() => (nameValue.value ? nameValue.value.charAt(0).toUpperCase() : '?'));

        const avatarStyle = computed(() => ({
            color: props.content?.initialLetterColor || '#FFFFFF',
            backgroundColor: props.content?.avatarBackgroundColor || 'rgba(1, 48, 157, 0.635)',
            borderColor: props.content?.avatarBorderColor || '#FFFFFF',
            boxShadow: `0 0 0 2px ${props.content?.avatarOuterBorderColor || '#E5E7EB'}`,
            fontSize: props.content?.initialLetterSize || '16px',
        }));

        const openFilePicker = () => {
            fileInput.value?.click();
        };

        const handleFileChange = event => {
            const [file] = event.target?.files || [];

            if (selectedImageUrl.value) {
                URL.revokeObjectURL(selectedImageUrl.value);
                selectedImageUrl.value = '';
            }

            if (file && file.type?.startsWith('image/')) {
                selectedImageUrl.value = URL.createObjectURL(file);
            }

            emit('trigger-event', {
                name: 'change',
                event: {
                    file: file || null,
                },
            });

            event.target.value = '';
        };

        onBeforeUnmount(() => {
            if (selectedImageUrl.value) {
                URL.revokeObjectURL(selectedImageUrl.value);
            }
        });

        return {
            fileInput,
            nameValue,
            initialValue,
            displayImage,
            hasDisplayImage,
            initialLetter,
            avatarStyle,
            openFilePicker,
            handleFileChange,
        };
    },
};
</script>

<style scoped>
.ww-avatar {
    margin: 0;
    padding: 0;
    z-index: unset;
    align-self: unset;
    display: inline-flex;
    position: relative;
    width: 100%;
    height: 100%;
    border: 3px solid;
    border-radius: 9999px;
    align-items: center;
    justify-content: center;
    font-family: var(--ww-default-font-family);
    line-height: 1;
    font-weight: 500;
    text-align: center;
    text-overflow: initial;
    white-space: pre-wrap;
    overflow: hidden;
    cursor: pointer;
    transition: 0.45s;
}

.ww-avatar__image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
}

.ww-avatar__initial {
    user-select: none;
}

.ww-avatar__input {
    display: none;
}
</style>
