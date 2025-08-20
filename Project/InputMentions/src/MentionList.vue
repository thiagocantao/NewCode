<template>
    <div class="items">
        <template v-if="items.length">
            <button
                class="item"
                :class="{ 'is-selected': index === selectedIndex }"
                v-for="(item, index) in items"
                :key="index"
                @click="selectItem(index)"
            >
                <span class="mention-avatar">{{ item.label.charAt(0).toUpperCase() }}</span>
                <span class="mention-info">
                    <span class="mention-label">{{ item.label }}</span>
                    <span class="mention-hint" v-if="item.hint">{{ item.hint }}</span>
                </span>
            </button>
        </template>
        <div class="item" v-else>No result</div>
    </div>
</template>

<script>
export default {
    props: {
        items: {
            type: Array,
            required: true,
        },

        command: {
            type: Function,
            required: true,
        },
    },

    data() {
        return {
            selectedIndex: 0,
        };
    },

    watch: {
        items() {
            this.selectedIndex = 0;
        },
    },

    methods: {
        onKeyDown({ event }) {
            switch (event.key) {
                case 'ArrowUp':
                    this.upHandler();
                    return true;
                case 'ArrowDown':
                    this.downHandler();
                    return true;
                case 'Enter':
                    this.enterHandler();
                    return true;
                default:
                    return false;
            }
        },

        upHandler() {
            this.selectedIndex = (this.selectedIndex + this.items.length - 1) % this.items.length;
        },

        downHandler() {
            this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        },

        enterHandler() {
            this.selectItem(this.selectedIndex);
        },

        selectItem(index) {
            const item = this.items[index];

            if (item) {
                this.command({ id: item.id, label: item.label, hint: item.hint });
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.items {
    padding: 0.2rem;
    position: relative;
    border-radius: 0.5rem;
    background: #fff;
    color: rgba(0, 0, 0, 0.8);
    overflow: hidden;
    font-size: 0.9rem;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1);
    max-height: 150px;
    overflow: auto;
}

.item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    width: 100%;
    text-align: left;
    background: transparent;
    border-radius: 0.4rem;
    border: 1px solid transparent;
    padding: 0.2rem 0.4rem;
}

.mention-info {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.mention-label {
    font-size: 13px;
}

.mention-hint {
    font-size: 12px;
}

.mention-avatar {
    display: inline-flex;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px #4f4f4f;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #95a9c9;
    color: #fff;
    font-size: 0.75rem;
    border-radius: 50px;
}
</style>
