<template>
  <div class="ww-timeline" :class="[
      `ww-timeline--${content.timelineLayout}`,
      `ww-timeline--align-${validAlignment}`,
    ]" :style="{
      '--connector-color': content.connectorColor,
      '--connector-width': content.connectorWidth,
      '--marker-size': content.markerSize,
      '--marker-icon-size': content.markerIconSize,
      '--marker-icon-color': content.markerIconColor,
      '--marker-background-color': content.markerBackgroundColor,
      '--connector-full-width': `${connectorWidth}px`,
    }">
    
    <div ref="containerRef" class="ww-timeline__container">
      <div v-for="(item, index) in events" :key="index" class="ww-timeline__event" :class="{
          'ww-timeline__event--alternate':
            content.timelineLayout === 'vertical' &&
            validAlignment === 'alternate' &&
            index % 2 === 1,
        }">
        <wwLayoutItemContext is-repeat :index="index" :data="item">
          <!-- Event marker -->
          <div class="ww-timeline__marker" :class="[`ww-timeline__marker--${content.markerShape}`]"
            @click.stop="onMarkerClick(item)">
            <i
                class="material-symbols-outlined ww-timeline__marker-icon"
              >
                {{ getItemIcon(item) }}
              </i>
          </div>
          <!-- Event content -->
          <div class="ww-timeline__content" @click.stop="onClick(item)">
            <template v-if="(item.TagControl || item.tagControl) === 'ActivityAdded'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>
                  <div class="activity-added-card__field">
                    Responsible User: {{ item.NewValueTitle.ResponsibleUserID }}
                  </div>
                  <div class="activity-added-card__field">
                    Start Time: {{ formatDate(item.NewValueTitle.StartTime) }}
                  </div>
                  <div class="activity-added-card__field">
                    End Time: {{ formatDate(item.NewValueTitle.EndTime) }}
                  </div>
                  <div class="activity-added-card__field">
                    Total: {{ formatDuration(item.NewValueTitle.TotalMinutes) }}
                  </div>
                  <div class="activity-added-card__field">
                    Description: {{ item.NewValueTitle.Description }}
                  </div>
                </div>
                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDate(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>
            <template v-else>
              <wwElement
                v-bind="content.timelineElement"
                class="ww-timeline__content-element"
              />
            </template>
          </div>
        </wwLayoutItemContext>
      </div>
    </div>
  </div>
</template>

<script>
  import { computed, ref, watch } from "vue";
import { useElementSize } from "@vueuse/core";

export default {
  props: {
    content: {
      type: Object,
      required: true,
    },
    dataSource: { type: [Array, String], default: null },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  emits: ["trigger-event"],
  setup(props, { emit }) {
    // References for measuring elements
    const containerRef = ref(null);
    const { width: containerWidth } = useElementSize(containerRef);

    const events = ref([]);
    const isInitialized = ref(false);

    watch(
      events,
      (newVal, oldVal) => {
        if (!isInitialized.value) {
          isInitialized.value = true;
          return;
        }
        emit("trigger-event", {
          name: "timeline:change",
          event: { value: newVal, oldValue: oldVal },
        });
      },
      { deep: true }
    );

    const getItemIcon = (item) =>
      item.IcoEventType || props.content.markerIcon || "";

    const formatDate = (value) => {
      if (!value) return "";
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const formatDuration = (minutes) => {
      const total = parseInt(minutes, 10);
      if (isNaN(total)) return minutes || "";
      const h = Math.floor(total / 60);
      const m = total % 60;
      return `${h}:${m.toString().padStart(2, "0")}`;
    };

   

    // For horizontal timeline, calculate total content width based on actual content
    const connectorWidth = computed(() => {
      if (props.content.timelineLayout === "horizontal") {
        // If we have a measurement for the container width, use it
        // Otherwise, calculate a width based on the number of events
        const dataLength = props.content?.data?.length || 0;
        const minWidth = Math.max(100, dataLength * 250);

        // +40 is for margins
        return containerWidth.value > 0 ? containerWidth.value + 40 : minWidth;
      }
      return 0;
    });

    watch(
      [() => props.content.dataSource, () => props.dataSource, () => props.content.data],
      ([contentDS, propDS, contentData]) => {
        let data = [];
        const ds = propDS ?? contentDS;
        if (ds && (typeof ds !== "string" || ds.trim())) {
          try {
            data = typeof ds === "string" ? JSON.parse(ds) : ds;
          } catch (e) {
            console.error("Failed to parse dataSource", e);
            data = [];
          }
        } else if (Array.isArray(contentData)) {
          data = contentData;
        }
        events.value = data;
      },
      { immediate: true, deep: true },
    );

    // Handle alignment based on layout
    const validAlignment = computed(() => {
      const layout = props.content.timelineLayout;
      const alignment = props.content.eventsAlignment;

      if (layout === "vertical") {
        // Check if the alignment is valid for vertical layout
        return ["left", "right", "alternate"].includes(alignment)
          ? alignment
          : "alternate"; // Default fallback for vertical
      } else {
        // Check if the alignment is valid for horizontal layout
        return ["top", "bottom"].includes(alignment) ? alignment : "top"; // Default fallback for horizontal
      }
    });

    return {
      events,
      getItemIcon,
      getFieldValue,
      formatDate,
      formatDuration,
      validAlignment,
      containerRef,
      connectorWidth,
    };
  },
  methods: {
    onClick(item) {
      this.$emit("trigger-event", {
        name: "timeline:click",
        event: { value: item },
      });
    },
    onMarkerClick(item) {
      this.$emit("trigger-event", {
        name: "timeline:markerClick",
        event: { value: item },
      });
    },
  },
};
</script>

<style lang="scss" scoped>
  @import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined");

  .material-symbols-outlined {
    font-family: "Material Symbols Outlined";
    font-weight: normal;
    font-style: normal;
    font-size: var(--marker-icon-size);
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    font-variation-settings:
      "FILL" 0,
      "wght" 400,
      "GRAD" 0,
      "opsz" var(--marker-icon-size);
  }

  .ww-timeline {
    position: relative;
    width: 100%;

    &--vertical {
      .ww-timeline__container {
        padding: 20px 0;
      }

      .ww-timeline__event {
        position: relative;
        margin: 0;
        padding-bottom: 20px;
        min-height: 50px;
      }

      /* Left alignment (default) */
      &.ww-timeline--align-left {
        .ww-timeline__event {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: flex-start;
        }

        .ww-timeline__container {
          padding-left: 40px;

          &::before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: 8px;
            width: 1px;
            background-color: transparent;
          }
        }

        .ww-timeline__marker {
          position: absolute;
          left: 0px;
          top: 15px;
          transform: translateX(-50%);
        }

        .ww-timeline__content {
          text-align: left;
          display: flex;
          justify-content: flex-start;
          width: 100%;
          margim-left: 30px;
        }
      }

      /* Right alignment */
      &.ww-timeline--align-right {
        .ww-timeline__container {
          container-type: inline-size;
          padding-right: 40px;

          /* Default - connector at right */
          &::before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            right: 8px;
            /* Position at 8px from the right edge */
            width: 1px;
            /* Center the connector regardless of width */
            background-color: transparent;
          }

          /* Large screens - connector in center */
          @container (min-width: 500px) {
            padding-right: 0;

            &::before {
              right: auto;
              left: 50%;
              transform: translateX(-50%);
            }
          }
        }

        .ww-timeline__marker {
          position: absolute;
          right: -32px;
          /* Position relative to connector */
          top: 15px;
          transform: translateX(50%);
          /* Center the marker on the connector */

          /* Large screens - marker in center */
          @container (min-width: 500px) {
            left: calc(50% - (30px / 2) + 20px);
            transform: none;
          }
        }

        .ww-timeline__content {
          text-align: right;
          align-items: flex-end;
          display: flex;
          justify-content: flex-end;
          width: 100%;
          /* Use full width */

          /* Large screens - content on left side of center connector */
          @container (min-width: 500px) {
            width: calc(50% - 30px / 2);
            margin-left: 0;
            text-align: right;
            justify-content: flex-end;
            align-items: flex-end;
          }
        }
      }

      /* Alternate alignment */
      &.ww-timeline--align-alternate {
        .ww-timeline__container {
          position: relative;

          &::before {
            content: "";
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            /* Center properly */
            width: 1px;
            background-color: transparent;
            z-index: 1;
          }
        }

        .ww-timeline__event {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          justify-content: flex-end;
          padding-right: 50%;
          padding-left: 0;

          .ww-timeline__marker {
            position: absolute;
            left: 50%;
            top: 15px;
            transform: translateX(-50%);
            z-index: 2;
          }

          .ww-timeline__content {
            width: 100%;
            margin-right: 30px;
            text-align: right;
            align-items: flex-end;
            display: flex;
            justify-content: flex-end;
          }

          &--alternate {
            justify-content: flex-start;
            padding-left: 50%;
            padding-right: 0;

            .ww-timeline__content {
              margin-right: 0;
              margin-left: 30px;
              text-align: left;
              align-items: flex-start;
              justify-content: flex-start;
              width: 100%;
            }
          }
        }
      }
    }

    &--horizontal {
      position: relative;
      /* Positioning context for fixed connector */

      .ww-timeline__container {
        display: flex;
        position: relative;
        padding: 40px 20px 20px;
        overflow-x: auto;
        width: 100%;
        /* Ensure the container takes full width */
      }

      .ww-timeline__event {
        position: relative;
        flex: 0 0 auto;
        /* Don't allow event to grow or shrink */
        margin: 0 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .ww-timeline__content {
        width: auto;
        /* Allow content to size to its children */
        flex: 0 0 auto;
        /* Prevent flex growing/shrinking */
      }

      /* Top alignment (default) */
      &.ww-timeline--align-top {
        .ww-timeline__container {
          padding-top: calc(20px + 30px);

          /* Hide the original ::before connector when using fixed connector */
          &::before {
            display: none;
          }
        }

        .ww-timeline__marker {
          position: absolute;
          top: calc(-1 * 30px - 12px);
        }

        .ww-timeline__content {
          justify-content: center;
          text-align: center;
        }
      }

      /* Bottom alignment */
      &.ww-timeline--align-bottom {
        .ww-timeline__container {
          padding-top: 20px;
          padding-bottom: calc(20px + 30px);

          /* Hide the original ::before connector when using fixed connector */
          &::before {
            display: none;
          }
        }

        .ww-timeline__marker {
          position: absolute;
          bottom: calc(-1 * 30px - 12px);
        }

        .ww-timeline__content {
          justify-content: center;
          text-align: center;
        }
      }
    }
  }

  .ww-timeline__marker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    background-color: #d0e7df;
    z-index: 2;
    cursor: pointer;

    &--circle {
      border-radius: 50%;
    }

    &--square {
      border-radius: 2px;
    }
  }

  .ww-timeline__marker-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #344767;
    font-size: 16px;
    line-height: 1;
  }

  .ww-timeline__fixed-connector {
    position: absolute;
    left: 0;
    z-index: 0;
    pointer-events: none;
    /* Allow clicking through the connector */
    background-color: transparent;
    height: 1px;
    width: 1px;

  }

  .ww-timeline__content {
    cursor: pointer;
    display: flex;
    /* Full width by default to allow proper alignment */
    width: 100%;
  }

  .ww-timeline__content-element {
    /* Base styles for the content element */
    display: flex;
    flex-direction: column;
    gap: 8px;

    /* This ensures any width/height set on the element will be respected */
    width: inherit;
    /* Inherit any width set on this element */
    height: inherit;
    /* Inherit any height set on this element */
  }

  /* Different alignment depending on timeline layout and alignment */
  .ww-timeline--vertical {
    &.ww-timeline--align-left .ww-timeline__content-element {
      align-items: flex-start;
    }

    &.ww-timeline--align-right .ww-timeline__content-element {
      align-items: flex-end;
    }

    &.ww-timeline--align-alternate {
      .ww-timeline__content-element {
        align-items: flex-end;
      }

      .ww-timeline__event--alternate .ww-timeline__content-element {
        align-items: flex-start;
      }
    }
  }

  .ww-timeline--horizontal .ww-timeline__content-element {
    align-items: center;
  }

  .activity-added-card {
    display: flex;
    justify-content: space-between;
    gap: 1rem;

    &__left {
      flex: 1;
    }

    &__right {
      text-align: right;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
    }

    &__title {
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    &__field {
      margin-bottom: 0.25rem;
    }
  }
</style>
