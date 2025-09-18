<template>
    <div class="mention-list">
        <label class="search" aria-label="Buscar menções">
            <span class="material-symbols-outlined search__icon" aria-hidden="true">search</span>
            <input
                v-model="searchTerm"
                type="text"
                class="search__input"
                placeholder="Buscar..."
            />
        </label>
        <div class="items">
            <template v-if="filteredItems.length">
                <button
                    class="item"
                    v-for="(item, index) in filteredItems"
                    :key="index"
                    @click="selectItem(index)"
                >
                    {{ item.label }}
                </button>
            </template>
            <div class="item item--empty" v-else>Nenhum resultado</div>
        </div>
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
            searchTerm: '',
        };
    },

    watch: {
        items() {
            this.selectedIndex = 0;
        },
        searchTerm() {
            this.selectedIndex = 0;
        },
    },

    computed: {
        filteredItems() {
            const query = this.searchTerm.trim().toLowerCase();
            if (!query) {
                return this.items;
            }

            return this.items.filter(item => item.label.toLowerCase().includes(query));
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
            if (!this.filteredItems.length) return;
            this.selectedIndex = (this.selectedIndex + this.filteredItems.length - 1) % this.filteredItems.length;
        },

        downHandler() {
            if (!this.filteredItems.length) return;
            this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
        },

        enterHandler() {
            this.selectItem(this.selectedIndex);
        },

        selectItem(index) {
            const item = this.filteredItems[index];

            if (item) {
                this.command({ id: item.id, label: item.label });
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.mention-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: relative;
    border-radius: 0.5rem;
    background: #fff;
    color: rgba(0, 0, 0, 0.8);
    font-size: 0.9rem;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    min-width: 220px;
}

.search {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 999px;
    padding: 0.35rem 0.75rem;
    background: #fff;
}

.search__icon {
    font-size: 1.1rem;
    color: rgba(0, 0, 0, 0.55);
}

.search__input {
    flex: 1;
    border: none;
    background: transparent;
    outline: none;
    font-size: 0.85rem;
    color: inherit;
    padding: 0;
}

.search__input::placeholder {
    color: rgba(0, 0, 0, 0.45);
}

.items {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 220px;
    overflow-y: auto;
}

.item {
    display: block;
    margin: 0;
    width: 100%;
    text-align: left;
    background: transparent;
    border-radius: 0.5rem;
    border: 1px solid transparent;
    padding: 0.35rem 0.5rem;
    transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;

    &:hover {
        border-color: rgba(0, 0, 0, 0.12);
        background: rgba(0, 0, 0, 0.05);
    }
}

.item--empty {
    text-align: center;
    color: rgba(0, 0, 0, 0.4);
}
</style>
