<template>
  <div class="ww-timeline" :class="[
      `ww-timeline--${content.timelineLayout}`,
      `ww-timeline--align-${validAlignment}`,
    ]" :style="{ 
      '--connector-color': content.connectorColor || '#E5E7EB',
      '--connector-width': content.connectorWidth || '2px',
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
          <!-- Marker -->
          <div class="ww-timeline__marker" :class="[`ww-timeline__marker--${content.markerShape || 'circle'}`]"
            @click.stop="onMarkerClick(item)">
            <i class="material-symbols-outlined ww-timeline__marker-icon">
              {{ getItemIcon(item) }}
            </i>
          </div>

          <!-- Content -->
          <div class="ww-timeline__content" @click.stop="onClick(item)">
            <!-- ActivityAdded -->
            <template v-if="(item.TagControl || item.tagControl) === 'ActivityAdded'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>

                  <dl class="activity-added-card__list">
                    <div class="row">
                      <dt>Responsible User:</dt>
                      <dd>{{ getResponsibleText(item) }}</dd>
                    </div>
                    <div class="row">
                      <dt>Start Time:</dt>
                      <dd>{{ formatDateUS(getFieldValue(item, 'StartTime')) }}</dd>
                    </div>
                    <div class="row">
                      <dt>End Time:</dt>
                      <dd>{{ formatDateUS(getFieldValue(item, 'EndTime')) }}</dd>
                    </div>
                    <div class="row">
                      <dt>Total:</dt>
                      <dd>{{ formatDuration(getFieldValue(item, 'TotalMinutes')) }}</dd>
                    </div>
                    <div class="row">
                      <dt>Description:</dt>
                      <dd>{{ getFieldValue(item, 'Description') }}</dd>
                    </div>
                  </dl>
                </div>

                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- FieldUpdated -->
<template v-else-if="(item.TagControl || item.tagControl) === 'FieldUpdated'">
  <!-- CASO ESPECIAL: FORMATED_TEXT -->
  <template v-if="isFormattedText(item)">
    <div class="activity-added-card">
      <div class="activity-added-card__left">
        <div class="activity-added-card__title title-row">
          <div class="activity-added-card__title">{{ item.Title }} - {{ item.NameFieldModified }}</div>
          <button class="details-link" @click.stop="openFtModal(item)">Details</button>
        </div>
      </div>
      <div class="activity-added-card__right">
        <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
        <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
      </div>
    </div>
  </template>

  <!-- CASO PADRÃO (mantém seu layout atual) -->
  <template v-else>
    <div class="activity-added-card">
      <div class="activity-added-card__left">
        <div class="activity-added-card__title">{{ item.Title }} - {{ item.NameFieldModified }}</div>
        <dl class="activity-added-card__list">
          <div class="row value-change">
            <dt></dt>
            <dd class="value-change__values">
              <span class="value-chip old" :style="getSideStyles(item, 'old')">
                {{ getOldValue(item) }}
              </span>
              <i class="material-symbols-outlined arrow">arrow_forward</i>
              <span class="value-chip new" :style="getSideStyles(item, 'new')">
                {{ getNewValue(item) }}
              </span>
            </dd>
          </div>
        </dl>
      </div>
      <div class="activity-added-card__right">
        <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
        <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
      </div>
    </div>
  </template>
</template>


            <!-- ActivityUpdated (Activity old -> new) -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'ActivityUpdated'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>

                  <dl class="activity-added-card__list">
                    <div class="row value-change">
                      <dt>Responsible User:</dt>
                      <dd class="value-change__values">
                        <span class="value-chip old">{{ getResponsibleActivityText(item, 'old') }}</span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new">{{ getResponsibleActivityText(item, 'new') }}</span>
                      </dd>
                    </div>

                    <div class="row value-change">
                      <dt>Start Time:</dt>
                      <dd class="value-change__values">
                        <span class="value-chip old">{{ formatDateUS(getActivityField(item, 'old', 'StartTime')) }}</span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new">{{ formatDateUS(getActivityField(item, 'new', 'StartTime')) }}</span>
                      </dd>
                    </div>

                    <div class="row value-change">
                      <dt>End Time:</dt>
                      <dd class="value-change__values">
                        <span class="value-chip old">{{ formatDateUS(getActivityField(item, 'old', 'EndTime')) }}</span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new">{{ formatDateUS(getActivityField(item, 'new', 'EndTime')) }}</span>
                      </dd>
                    </div>

                    <div class="row value-change">
                      <dt>Total:</dt>
                      <dd class="value-change__values">
                        <span class="value-chip old">{{ formatDuration(getActivityField(item, 'old', 'TotalMinutes')) }}</span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new">{{ formatDuration(getActivityField(item, 'new', 'TotalMinutes')) }}</span>
                      </dd>
                    </div>

                    <div class="row value-change">
                      <dt>Description:</dt>
                      <dd class="value-change__values">
                        <span class="value-chip old">{{ getActivityField(item, 'old', 'Description') }}</span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new">{{ getActivityField(item, 'new', 'Description') }}</span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- StatusChanged -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'StatusChanged'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>
                  <dl class="activity-added-card__list">
                    <div class="row value-change">
                      <dt></dt>
                      <dd class="value-change__values">
                        <span class="value-chip status-chip old" :style="getSideStyles(item, 'old', 4)">
                          {{ getOldTitle(item) }}
                        </span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip status-chip new" :style="getSideStyles(item, 'new', 4)">
                          {{ getNewTitle(item) }}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- CategoryChanged -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'CategoryChanged'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>
                  <dl class="activity-added-card__list">
                    <div class="row value-change">
                      <dt></dt>
                      <dd class="value-change__values">
                        <span class="value-chip old" :style="getSideStyles(item, 'old', 14)">
                          {{ getOldTitle(item) }}
                        </span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new" :style="getSideStyles(item, 'new', 14)">
                          {{ getNewTitle(item) }}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- UrgencyChanged -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'UrgencyChanged'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>
                  <dl class="activity-added-card__list">
                    <div class="row value-change">
                      <dt></dt>
                      <dd class="value-change__values">
                        <span class="value-chip old" :style="getSideStyles(item, 'old', 14)">
                          {{ getOldTitle(item) }}
                        </span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new" :style="getSideStyles(item, 'new', 14)">
                          {{ getNewTitle(item) }}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- PriorityChanged -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'PriorityChanged'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>
                  <dl class="activity-added-card__list">
                    <div class="row value-change">
                      <dt></dt>
                      <dd class="value-change__values">
                        <span class="value-chip old" :style="getSideStyles(item, 'old', 14)">
                          {{ getOldTitle(item) }}
                        </span>
                        <i class="material-symbols-outlined arrow">arrow_forward</i>
                        <span class="value-chip new" :style="getSideStyles(item, 'new', 14)">
                          {{ getNewTitle(item) }}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- PublicCommentAdded -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'PublicCommentAdded'">
              <div class="activity-added-card comment-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>

                  <!-- Botão de menu (3 pontos) -->
                  <button
                    class="comment-menu-btn"
                    title="More"
                    @click.stop="toggleCommentMenu(item)"
                  >
                    <i class="material-symbols-outlined">more_vert</i>
                  </button>

                  <!-- Popup menu -->
                  <div v-if="isMenuOpen(item)" class="comment-menu" @click.stop>
                    <button class="comment-menu-item" @click="editComment(item)">
                      <i class="material-symbols-outlined">edit</i>
                      <span>Edit</span>
                    </button>
                    <button class="comment-menu-item danger" @click="deleteComment(item)">
                      <i class="material-symbols-outlined">delete</i>
                      <span>Delete</span>
                    </button>
                  </div>

                  <div class="comment-content" v-html="getCommentHtml(item)"></div>
                </div>

                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- InternalCommentAdded -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'InternalCommentAdded'">
              <div class="activity-added-card comment-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>

                  <!-- Botão de menu (3 pontos) -->
                  <button
                    class="comment-menu-btn"
                    title="More"
                    @click.stop="toggleCommentMenu(item)"
                  >
                    <i class="material-symbols-outlined">more_vert</i>
                  </button>

                  <!-- Popup menu -->
                  <div v-if="isMenuOpen(item)" class="comment-menu" @click.stop>
                    <button class="comment-menu-item" @click="editComment(item)">
                      <i class="material-symbols-outlined">edit</i>
                      <span>Edit</span>
                    </button>
                    <button class="comment-menu-item danger" @click="deleteComment(item)">
                      <i class="material-symbols-outlined">delete</i>
                      <span>Delete</span>
                    </button>
                  </div>

                  <div class="comment-content" v-html="getCommentHtml(item)"></div>
                </div>

                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- InternalCommentEdited (diff old -> new) -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'InternalCommentEdited'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>
                  <div class="comment-diff">
                    <div class="comment-bubble old">
                      <div class="bubble-label"></div>
                      <div class="bubble-body" v-html="getSideCommentHtml(item, 'old')"></div>
                    </div>
                    <i class="material-symbols-outlined arrow">arrow_forward</i>
                    <div class="comment-bubble new">
                      <div class="bubble-label"></div>
                      <div class="bubble-body" v-html="getSideCommentHtml(item, 'new')"></div>
                    </div>
                  </div>
                </div>

                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- AttachmentAdded -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'AttachmentAdded'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>

                  <div class="attachment-box" v-if="getAttachment(item)">
                    <div class="attach-thumb-wrap" @click.stop="openAttachmentModal(item)">
                      <template v-if="getAttachment(item).isImage && getAttachment(item).url">
                        <img
                          :src="getAttachment(item).url"
                          :alt="getAttachment(item).file.name"
                          class="attach-thumb"
                        />
                      </template>
                      <template v-else>
                        <div class="attach-icon-wrap">
                          <i :class="['attach-icon', getFileIcon(getAttachment(item).file.name)]"></i>
                        </div>
                      </template>

                      <!-- ações no hover -->
                      <div class="attach-actions">
                        <button
                          class="attach-action-btn"
                          title="Download"
                          @click.stop="attDownload(getAttachment(item))"
                        >
                          <i class="material-symbols-outlined">download</i>
                        </button>
                        <button
                          class="attach-action-btn danger"
                          title="Delete"
                          @click.stop="requestAttDelete(item)"
                        >
                          <i class="material-symbols-outlined">delete</i>
                        </button>
                      </div>
                    </div>

                    <div class="attach-name" :title="getAttachment(item).file.name">
                      {{ getAttachment(item).file.name }}
                    </div>
                  </div>

                  <div class="attachment-box loading" v-else>
                    <div class="attach-skeleton"></div>
                    <div class="attach-name skeleton-line">Loading…</div>
                  </div>
                </div>

                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- AttachmentDeleted -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'AttachmentDeleted'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <div class="activity-added-card__title">{{ item.Title }}</div>
                  <dl class="activity-added-card__list">
                    <div class="row">
                      <dt>File:</dt>
                      <dd>{{ getDeletedAttachmentName(item) }}</dd>
                    </div>
                  </dl>
                </div>
                <div class="activity-added-card__right">
                  <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
                  <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
                </div>
              </div>
            </template>

            <!-- AssigneeChanged -->
            <template v-else-if="(item.TagControl || item.tagControl) === 'AssigneeChanged'">
              <div class="activity-added-card">
                <div class="activity-added-card__left">
                  <!-- Título + avatares com hint -->
                  <div class="activity-added-card__title title-row">
                    <span>{{ item.Title }}</span>

                    <span class="assignee-avatars">
                      <!-- avatar antigo -->
                      <span
                        class="avatar-wrapper"
                        :aria-label="getAssigneeName(item, 'old')"
                        tabindex="0"
                      >
                        <span class="avatar-badge" :title="getAssigneeName(item, 'old')">
                          <img
                            v-if="getAssigneeAvatar(item, 'old')"
                            :src="getAssigneeAvatar(item, 'old')"
                            :alt="getAssigneeName(item, 'old')"
                          />
                          <span v-else>{{ getInitials(getAssigneeName(item, 'old')) }}</span>
                    </span>

                    <!-- popup/hint (card) -->
                    <span class="avatar-hint" role="tooltip">
                          <div class="user-popcard">
                            <span class="user-popcard__photo">
                              <img
                                v-if="getAssigneeAvatar(item, 'old')"
                                :src="getAssigneeAvatar(item, 'old')"
                                :alt="getAssigneeName(item, 'old')"
                              />
                              <span v-else class="user-popcard__initials">
                                {{ getInitials(getAssigneeName(item, 'old')) }}
                              </span>
                    </span>
                    <div class="user-popcard__meta">
                      <div class="user-popcard__name">{{ getAssigneeName(item, 'old') }}</div>
                    </div>
                  </div>
                  </span>
                  </span>

                  <i class="material-symbols-outlined arrow">arrow_forward</i>

                  <!-- avatar novo -->
                  <span
                        class="avatar-wrapper"
                        :aria-label="getAssigneeName(item, 'new')"
                        tabindex="0"
                      >
                        <span class="avatar-badge" :title="getAssigneeName(item, 'new')">
                          <img
                            v-if="getAssigneeAvatar(item, 'new')"
                            :src="getAssigneeAvatar(item, 'new')"
                            :alt="getAssigneeName(item, 'new')"
                          />
                          <span v-else>{{ getInitials(getAssigneeName(item, 'new')) }}</span>
                  </span>

                  <!-- popup/hint (card) -->
                  <span class="avatar-hint" role="tooltip">
                          <div class="user-popcard">
                            <span class="user-popcard__photo">
                              <img
                                v-if="getAssigneeAvatar(item, 'new')"
                                :src="getAssigneeAvatar(item, 'new')"
                                :alt="getAssigneeName(item, 'new')"
                              />
                              <span v-else class="user-popcard__initials">
                                {{ getInitials(getAssigneeName(item, 'new')) }}
                              </span>
                  </span>
                  <div class="user-popcard__meta">
                    <div class="user-popcard__name">{{ getAssigneeName(item, 'new') }}</div>
                  </div>
                </div>
                </span>
                </span>
                </span>
              </div>
          </div>

          <div class="activity-added-card__right">
            <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
            <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
          </div>
      </div>
</template>

<!-- TicketLinked -->
<template v-else-if="(item.TagControl || item.tagControl) === 'TicketLinked'">
  <div class="activity-added-card">
    <div class="activity-added-card__left">
      <div class="activity-added-card__title title-row">
        <span>{{ item.Title }}</span>
        <span class="link-badge" v-if="getTicketLinkedLabel(item)">
          {{ getTicketLinkedLabel(item) }}
        </span>
      </div>
    </div>

    <div class="activity-added-card__right">
      <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
      <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
    </div>
  </div>
</template>

<!-- TicketUnlinked -->
<template v-else-if="(item.TagControl || item.tagControl) === 'TicketUnlinked'">
  <div class="activity-added-card">
    <div class="activity-added-card__left">
      <div class="activity-added-card__title title-row">
        <span>{{ item.Title }}</span>
        <span class="link-badge" v-if="getTicketLinkedLabel(item)">
          {{ getTicketLinkedLabel(item) }}
        </span>
      </div>
    </div>

    <div class="activity-added-card__right">
      <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
      <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
    </div>
  </div>
</template>

<!-- TicketCreated -->
<template v-else-if="(item.TagControl || item.tagControl) === 'TicketCreated'">
  <div class="activity-added-card">
    <div class="activity-added-card__left">
      <div class="activity-added-card__title title-row">
        <span>{{ item.Title }}</span>
        <span class="link-badge" v-if="getTicketCreatedTitle(item)">
          {{ getTicketCreatedTitle(item) }}
        </span>
      </div>
    </div>

    <div class="activity-added-card__right">
      <div class="activity-added-card__created-by">{{ item.CreatedByName }}</div>
      <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
    </div>
  </div>
</template>


<!-- MessageSent -->
<template v-else-if="(item.TagControl || item.tagControl) === 'MessageSent'">
  <div class="activity-added-card">
    <div class="activity-added-card__left">
      <!-- Title: do JSON (item.Title) + view link -->
      <div class="activity-added-card__title title-row">
        <div class="activity-added-card__title">{{ item.Title }}</div>
        <div class="view-link" @click.stop="viewMessage(item)">
          <i class="material-symbols-outlined">open_in_new</i>
          <span>View</span>
        </div>
      </div>

      <dl class="activity-added-card__list">
        <div class="row">
          <dt>From:</dt>
          <dd>{{ getFromEmails(item) }}</dd>
        </div>
        <div class="row">
          <dt>To:</dt>
          <dd>{{ getToEmails(item) }}</dd>
        </div>
      </dl>
    </div>

    <!-- Lado direito: igual aos outros cards -->
    <div class="activity-added-card__right">
      <div class="activity-added-card__created-by">{{ item.Title }}</div>
      <div class="activity-added-card__created-date">{{ formatDateDash(item.CreatedDate) }}</div>
    </div>
  </div>
</template>

<!-- Conteúdo padrão -->
<template v-else>
  <wwElement v-bind="content.timelineElement" class="ww-timeline__content-element" />
</template>
</div>
</wwLayoutItemContext>
</div>
</div>

<!-- Modal FieldUpdated FORMATED_TEXT -->
<div v-if="ftModalOpen" class="ft-modal-overlay" @click.self="closeFtModal">
  <div class="ft-modal">
    <div class="ft-modal__header">
      <div class="ft-modal__title">
        {{ ftModalItem?.NameFieldModified || 'Details' }}
      </div>
      <button class="ft-modal__close" @click="closeFtModal">
        <i class="material-symbols-outlined">close</i>
      </button>
    </div>

    <div class="ft-modal__body">
      <div class="ft-col">
        <div class="ft-col__label"></div>
        <div class="ft-col__content" v-html="getFormattedHtml(ftModalItem, 'old')"></div>
      </div>

      <div class="ft-arrow">
        <i class="material-symbols-outlined">arrow_forward</i>
      </div>

      <div class="ft-col">
        <div class="ft-col__label"></div>
        <div class="ft-col__content" v-html="getFormattedHtml(ftModalItem, 'new')"></div>
      </div>
    </div>
  </div>
</div>


<!-- Modal AttachmentAdded -->
<div v-if="attModalOpen" class="tl-modal-overlay" @click.self="closeAttModal">
  <div class="tl-modal-content" :class="{ 'pdf-viewer': attModalFile && attModalFile.isPdf }">
    <div class="tl-modal-top-actions">
      <button
            v-if="attModalFile && !attModalFile.isPdf"
            class="tl-modal-action-button"
            @click="attDownload(attModalFile)"
          >
            <i class="material-symbols-outlined">download</i>
          </button>
      <button class="tl-modal-action-button" @click="closeAttModal">
            <i class="material-symbols-outlined">close</i>
          </button>
    </div>

    <div class="tl-modal-body">
      <template v-if="attModalFile && attModalFile.isImage && attModalFile.url">
        <img
              :src="attModalFile.url"
              alt=""
              class="tl-modal-image"
              :style="{ transform: `scale(${attZoom})` }"
            />
        <div class="tl-modal-file-name">{{ attModalFile.file.name }}</div>
        <div class="tl-zoom-controls">
          <button class="tl-zoom-button" @click="zoomOutAtt">
                <i class="material-symbols-outlined tl-zoom-button">zoom_out</i>
              </button>
          <button class="tl-zoom-button" @click="zoomInAtt">
                <i class="material-symbols-outlined tl-zoom-button">zoom_in</i>
              </button>
        </div>
      </template>

      <template v-else-if="attModalFile && attModalFile.isPdf && attModalFile.url">
        <iframe :src="attModalFile.url" class="tl-modal-pdf"></iframe>
        <div class="tl-modal-file-name">{{ attModalFile.file.name }}</div>
      </template>

      <template v-else-if="attModalFile && attModalFile.isTxt">
        <pre class="tl-modal-txt">{{ attModalFile.textContent || 'Carregando…' }}</pre>
        <div class="tl-modal-file-name">{{ attModalFile.file.name }}</div>
      </template>

      <template v-else>
        <div class="tl-file-not-viewable">
          <i
                v-if="attModalFile"
                :class="['tl-modal-file-icon', getFileIcon(attModalFile.file.name)]"
              ></i>
          <p class="tl-no-preview">This file cannot be viewed</p>
        </div>
      </template>
    </div>
  </div>
</div>

<!-- Popup de confirmação (delete attachment) -->
<div v-if="confirmOpen" class="confirm-overlay" @click.self="cancelDelete" role="dialog" aria-modal="true"
  aria-labelledby="confirm-title">
  <div class="confirm-dialog">
    <div class="confirm-header">
      <div class="confirm-icon">
        <i class="material-symbols-outlined">warning</i>
      </div>
      <div class="confirm-titles">
        <div id="confirm-title" class="confirm-title">Delete attachment</div>
        <div class="confirm-subtitle">
          Are you sure you want to delete this attachment? This action cannot be undone.
        </div>
      </div>
      <button class="confirm-close" @click="cancelDelete" aria-label="Close">
            <i class="material-symbols-outlined">close</i>
          </button>
    </div>

    <div class="confirm-actions">
      <button class="btn btn-light" @click="cancelDelete">Cancel</button>
      <button class="btn btn-danger" @click="confirmDelete">Delete</button>
    </div>
  </div>
</div>
</div>
</template>

<script>
  import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useElementSize } from "@vueuse/core";

export default {
  props: {
    content: { type: Object, required: true },
    dataSource: { type: [Array, Object, String], default: null },
    /* wwEditor:start */ wwEditorState: { type: Object, required: true }, /* wwEditor:end */
  },
  emits: ["trigger-event"],
  setup(props, { emit }) {
    const containerRef = ref(null);
    const { width: containerWidth } = useElementSize(containerRef);
    const events = ref([]);

    const parseMaybeJSON = (val) => {
      if (typeof val === "string") { try { return JSON.parse(val); } catch { return null; } }
      return val && typeof val === "object" ? val : null;
    };

    /* ========= TicketLinked ========= */
    const getTicketLinkedObj = (item) => {
      if (item?.FieldNewValue && typeof item.FieldNewValue === "object") return item.FieldNewValue;
      const parsed = parseMaybeJSON(item?.NewValueTitle);
      return parsed || {};
    };

  /* ========= TicketUnlinked ========= */
    const getTicketUnlinkedObj = (item) => {
      if (item?.FieldOldValue && typeof item.FieldOldValue === "object") return item.FieldOldValue;
      const parsed = parseMaybeJSON(item?.OldValueTitle);
      return parsed || {};
    };

    const getTicketLinkedLabel = (item) => {
      const o = item.tagControl == "TicketLinked" || item.TagControl == "TicketLinked" ? getTicketLinkedObj(item) : getTicketUnlinkedObj(item);
      const type =
        o?.TicketType ?? o?.ticketType ?? o?.Type ?? o?.type ?? "";
      const number =
        o?.TicketNumber ?? o?.ticketNumber ?? o?.Number ?? o?.number ?? "";
      if (!type && !number) return "";
      return `${type}${number ? ` #${number}` : ""}`;
    };

    /* ========= TicketCreated ========= */
    const getTicketCreatedObj = (item) => {
      if (item?.FieldNewValue && typeof item.FieldNewValue === "object") return item.FieldNewValue;
      const parsed = parseMaybeJSON(item?.NewValueTitle);
      return parsed || {};
    };
    const getTicketCreatedTitle = (item) => {
      const o = getTicketCreatedObj(item);
      return o?.Title ?? o?.title ?? "";
    };

// --- FieldUpdated FORMATED_TEXT helpers ---
const ftModalOpen = ref(false);
const ftModalItem = ref(null);

function isFormattedText(item) {
  return (item?.FieldTypeControl || item?.fieldTypeControl) === "FORMATED_TEXT";
}

function openFtModal(item) {
  ftModalItem.value = item;
  ftModalOpen.value = true;
}

function closeFtModal() {
  ftModalOpen.value = false;
  ftModalItem.value = null;
}

function getFormattedHtml(item, side) {
  if (!item) return "";
  const raw = side === "old"
    ? (item.FieldOldValue ?? item.OldValueTitle ?? "")
    : (item.FieldNewValue ?? item.NewValueTitle ?? "");

  // Se vier JSON, tenta extrair string/html de dentro; senão usa o próprio valor
  const parsed = parseMaybeJSON(raw);
  const html = typeof parsed === "string"
    ? parsed
    : (parsed && typeof parsed.html === "string")
      ? parsed.html
      : (typeof raw === "string" ? raw : "");

  return sanitizeHtml(html); // mantém HTML, mas remove JS/handlers perigosos
}


    /* ========= ActivityAdded ========= */
    const getActivityObj = (item) => {
      if (item?.FieldNewValue && typeof item.FieldNewValue === "object") return item.FieldNewValue;
      const parsed = parseMaybeJSON(item?.NewValueTitle);
      return parsed || {};
    };
    const getFieldValue = (item, field) => getActivityObj(item)?.[field] ?? "";
    const getResponsibleText = (item) => {
      const a = getActivityObj(item);
      return a?.ResponsibleUser?.Username || "";
    };

    /* ========= ActivityUpdated ========= */
    const getActivityOldObj = (item) => {
      if (item?.FieldOldValue && typeof item.FieldOldValue === "object") return item.FieldOldValue;
      const parsed = parseMaybeJSON(item?.OldValueTitle);
      return parsed || {};
    };
    const getActivityNewObj = (item) => {
      if (item?.FieldNewValue && typeof item.FieldNewValue === "object") return item.FieldNewValue;
      const parsed = parseMaybeJSON(item?.NewValueTitle);
      return parsed || {};
    };
    const getActivityField = (item, side, field) => {
      const obj = side === "new" ? getActivityNewObj(item) : getActivityOldObj(item);
      return obj?.[field] ?? "";
    };
    const getResponsibleActivityText = (item, side) => {
      const obj = side === "new" ? getActivityNewObj(item) : getActivityOldObj(item);
      return obj?.ResponsibleUser?.Username || "";
    };

    /* ========= Updated / Status ========= */
    const toDisplay = (v) =>
      v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    const getOldValue = (item) => {
      const raw = item.FieldOldValue ?? item.OldValueTitle ?? null;
      const parsed = parseMaybeJSON(raw); return toDisplay(parsed ?? raw);
    };
    const getNewValue = (item) => {
      const raw = item.FieldNewValue ?? item.NewValueTitle ?? null;
      const parsed = parseMaybeJSON(raw); return toDisplay(parsed ?? raw);
    };
    const getOldTitle = (item) => toDisplay(item?.OldValueTitle ?? "");
    const getNewTitle = (item) => toDisplay(item?.NewValueTitle ?? "");

    const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";
    const getSideStyles = (item, side, radiusOverride = null) => {
      const p = side === "new" ? "New" : "Old";
      const style = {};
      const bg = item?.[`${p}BackgroundColor`];
      const color = item?.[`${p}TextColor`];
      const isBold = item?.[`${p}IsBold`];
      const isRounded = item?.[`${p}IsRounded`];
      style.padding = "3px 12px";
      if (bg) style.backgroundColor = bg;
      if (color) style.color = color;
      if (toBool(isBold)) style.fontWeight = 500;
      if (radiusOverride != null) style.borderRadius = `${radiusOverride}px`;
      else if (toBool(isRounded)) style.borderRadius = "14px";
      return style;
    };

    /* ========= Comments ========= */
    const sanitizeHtml = (html) => {
      if (!html || typeof html !== "string") return "";
      let out = html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
      out = out.replace(/\son\w+="[^"]*"/gi, "").replace(/\son\w+='[^']*'/gi, "");
      out = out.replace(/href\s*=\s*"(javascript:[^"]*)"/gi, 'href="#"');
      out = out.replace(/href\s*=\s*'(javascript:[^']*)'/gi, "href='#'");
      return out;
    };
    // Comentários para *Added* (vem do "novo")
    const getCommentHtml = (item) => {
      const obj = getActivityObj(item);
      const raw = obj?.Comment ?? obj?.comment ?? "";
      return sanitizeHtml(raw);
    };
    const getCommentPlain = (item) => {
      const obj = getActivityObj(item);
      return obj?.Comment ?? obj?.comment ?? "";
    };
    const getCommentId = (item) => {
      const obj = getActivityObj(item);
      return obj?.TicketCommentID ?? obj?.TicketCommentId ?? obj?.ticketCommentId ?? "";
    };

    // Comentários para *Edited* (old/new explícitos)
    const getSideObj = (item, side) => {
      if (side === "old") {
        if (item?.FieldOldValue && typeof item.FieldOldValue === "object") return item.FieldOldValue;
        return parseMaybeJSON(item?.OldValueTitle) || {};
      }
      if (item?.FieldNewValue && typeof item.FieldNewValue === "object") return item.FieldNewValue;
      return parseMaybeJSON(item?.NewValueTitle) || {};
    };
    const getSideCommentHtml = (item, side) => {
      const obj = getSideObj(item, side);
      return sanitizeHtml(obj?.Comment ?? obj?.comment ?? "");
    };

    /* ========= AssigneeChanged ========= */
    const getAssigneeRaw = (item, side) => (side === "new")
      ? (item.FieldNewValue ?? item.NewValueTitle ?? null)
      : (item.FieldOldValue ?? item.OldValueTitle ?? null);

    const getAssigneeName = (item, side) => {
      const raw = getAssigneeRaw(item, side);
      const parsed = parseMaybeJSON(raw);
      if (parsed && typeof parsed === "object") {
        return parsed.Username || parsed.AssigneeName || parsed.UserName || parsed.FullName || parsed.DisplayName || parsed.name || "";
      }
      return toDisplay(raw);
    };

    const getAssigneeAvatar = (item, side) => {
      const raw = getAssigneeRaw(item, side);
      const parsed = parseMaybeJSON(raw);
      if (parsed && typeof parsed === "object") return parsed.Photo || parsed.AvatarUrl || parsed.avatar || parsed.PhotoUrl || "";
      return "";
    };

    const getInitials = (name) => {
      if (!name) return "?";
      const parts = String(name).trim().split(/\s+/).filter(Boolean);
      const first = parts[0]?.[0] || "";
      const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
      return (first + last).toUpperCase() || first.toUpperCase() || "?";
    };

    /* ========= Ícones e datas ========= */
    const getItemIcon = (item) => item?.IcoEventType || props.content.markerIcon || "";
    const formatDateUS = (v) => {
      if (!v) return "";
      const d = new Date(v); if (isNaN(d.getTime())) return String(v);
      return d.toLocaleString("en-US", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:true });
    };
    const formatDateDash = (v) => {
      if (!v) return "";
      const d = new Date(v); if (isNaN(d.getTime())) return String(v);
      const dd = String(d.getDate()).padStart(2,"0");
      const mm = String(d.getMonth()+1).padStart(2,"0");
      const yyyy = d.getFullYear();
      const HH = String(d.getHours()).padStart(2,"0");
      const MM = String(d.getMinutes()).padStart(2,"0");
      return `${dd}-${mm}-${yyyy} ${HH}:${MM}`;
    };
    const formatDuration = (min) => {
      const t = parseInt(min, 10);
      if (isNaN(t)) return min ?? "";
      const h = Math.floor(t/60), m = t%60;
      return `${h}:${m.toString().padStart(2,"0")}`;
    };

    /* ========= MessageSent helpers ========= */
    const normalizeEmails = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.filter(Boolean);
      if (typeof val === "string") {
        return val.split(/[,;]\s*/).filter(Boolean);
      }
      return [];
    };

    const getFromEmails = (item) => {
      const o = getActivityObj(item) || {};
      const cands = [
        o.FromUsersMail, o.FromUserEmails, o.FromEmails, o.FromEmail,
        o.fromUsersMail, o.fromUserEmails, o.fromEmails, o.fromEmail
      ];
      const found = cands.find(v => v && (Array.isArray(v) || typeof v === "string"));
      const list = normalizeEmails(found);
      return list.join(", ");
    };

    const getToEmails = (item) => {
      const o = getActivityObj(item) || {};
      const cands = [
        o.ToUsersMail, o.ToUserEmails, o.ToEmails, o.ToEmail,
        o.toUsersMail, o.toUserEmails, o.toEmails, o.toEmail
      ];
      const found = cands.find(v => v && (Array.isArray(v) || typeof v === "string"));
      const list = normalizeEmails(found);
      return list.join(", ");
    };

    /* ========= Data source ========= */
    watch(
      [() => props.content.dataSource, () => props.dataSource, () => props.content.data],
      ([contentDS, propDS, contentData]) => {
        let data = []; const ds = propDS ?? contentDS ?? contentData;
        try {
          if (typeof ds === "string" && ds.trim()) {
            const parsed = JSON.parse(ds);
            data = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
          } else if (Array.isArray(ds)) data = ds;
          else if (ds && typeof ds === "object") data = [ds];
          else data = [];
        } catch(e) {
          console.error("Failed to parse dataSource", e); data = [];
        }
        events.value = data;
      },
      { immediate: true, deep: true }
    );

    const validAlignment = computed(() => {
      const layout = props.content.timelineLayout;
      const alignment = props.content.eventsAlignment;
      if (layout === "vertical") return ["left","right","alternate"].includes(alignment) ? alignment : "left";
      return ["top","bottom"].includes(alignment) ? alignment : "top";
    });

    const connectorWidth = computed(() => {
      if (props.content.timelineLayout === "horizontal") {
        const count =
          (Array.isArray(events.value) && events.value.length) ||
          (Array.isArray(props.content?.data) && props.content.data.length) ||
          0;
        const minWidth = Math.max(100, count * 250);
        return containerWidth.value > 0 ? containerWidth.value + 40 : minWidth;
      }
      return 0;
    });

    /* ========= AttachmentAdded infra ========= */
    const sb = window?.wwLib?.wwPlugins?.supabase;
    const supabase = sb?.instance;
    const auth = window?.wwLib?.wwPlugins?.supabaseAuth?.publicInstance;

    const getVar = (id) => window?.wwLib?.wwVariable?.getValue?.(id);
    const setVar = (id, val, opts = {}) =>
      window?.wwLib?.wwVariable?.updateValue?.(id, val, opts);

    const workspaceVarId = "744511f1-3309-41da-a9fd-0721e7dd2f99";
    const loggedUserVarId = "fc54ab80-1a04-4cfe-a504-793bdcfce5dd";
    const ticketVarId = "7bebd888-f31e-49e7-bef2-4052c8cb6cf5";

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async function ensureAuthReady(maxMs = 4000) {
      try {
        if (!auth?.auth?.getUser) return true;
        const start = Date.now();
        while (Date.now() - start < maxMs) {
          const { data, error } = await auth.auth.getUser();
          if (data?.user && !error) return true;
          await sleep(200);
        }
      } catch (_) {}
      return true;
    }

    const detectFileKind = (name, mimetype = "") => {
      const ext = (String(name).split(".").pop() || "").toLowerCase();
      const mime = (mimetype || "").toLowerCase();
      const isImage = mime.startsWith("image/") || ["png","jpg","jpeg","gif","webp","bmp","svg"].includes(ext);
      const isPdf   = mime.startsWith("application/pdf") || ext === "pdf";
      const isTxt   = mime.startsWith("text/") || mime.includes("text/plain") || ext === "txt" || ext === "log";
      return { isImage, isPdf, isTxt };
    };

    async function getFreshSignedUrl(file, { forceDownloadName, transformImage } = {}) {
      if (!file?.bucket || !file?.storagePath || !supabase) return null;
      await ensureAuthReady();
      const options = {};
      if (transformImage && file.isImage) options.transform = transformImage;
      if (forceDownloadName) options.download = forceDownloadName;

      const { data, error } = await supabase
        .storage
        .from(file.bucket)
        .createSignedUrl(file.storagePath, 60 * 60, options);
      if (error) { console.warn("[TimeLine] createSignedUrl falhou:", error); return null; }
      return data?.signedUrl || null;
    }

    async function loadTxtIfNeeded(file) {
      if (!file || file.textContent || !file.isTxt) return;
      if (!file.url) {
        file.url = file.signedUrl = await getFreshSignedUrl(file);
        if (!file.url) return;
      }
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        file.textContent = await res.text();
      } catch (e) {
        console.warn("[TimeLine] Falha ao carregar TXT:", e);
        file.textContent = "(Não foi possível carregar este texto)";
      }
    }

    const attCache = ref({});
    const fetching = new Set();
    const eventKey = (item) => item?.EventID || `${item?.CreatedDate || ""}-${item?.Title || ""}`;

    async function prepareAttachment(item) {
      const key = eventKey(item);
      if (fetching.has(key)) return;
      fetching.add(key);
      try {
        const obj = (item?.FieldNewValue && typeof item.FieldNewValue === "object")
          ? item.FieldNewValue
          : (parseMaybeJSON(item?.NewValueTitle) || null);
        if (!obj) { fetching.delete(key); return; }

        const fileName = obj.FileName || "file";
        const mimeType = obj.MimeType || "";
        const bucket = obj.BucketName || "ticket";
        const path = obj.ObjectPath;
        const size = obj.FileSizeBytes || 0;

        const kind = detectFileKind(fileName, mimeType);
        const fileInfo = {
          file: { name: fileName, size, type: mimeType },
          url: null,
          isImage: kind.isImage,
          isPdf: kind.isPdf,
          isTxt: kind.isTxt,
          bucket,
          storagePath: path,
          signedUrl: null,
          textContent: null,
        };
        const signed = await getFreshSignedUrl(fileInfo, { transformImage: { width: 1200, resize: "contain" } });
        fileInfo.url = fileInfo.signedUrl = signed;
        if (fileInfo.isTxt) await loadTxtIfNeeded(fileInfo);
        attCache.value = { ...attCache.value, [key]: fileInfo };
      } catch (e) {
        console.warn("[TimeLine] prepareAttachment error:", e);
      } finally {
        fetching.delete(key);
      }
    }

    function getAttachment(item) {
      const key = eventKey(item);
      const cached = attCache.value[key];
      if (!cached && (item.TagControl || item.tagControl) === "AttachmentAdded" && !fetching.has(key)) {
        prepareAttachment(item);
      }
      if (cached && cached.deleted) return null;
      return cached || null;
    }

    // AttachmentDeleted helpers
    const getDeletedAttachmentName = (item) => {
      const obj =
        (item?.FieldOldValue && typeof item.FieldOldValue === "object")
          ? item.FieldOldValue
          : (parseMaybeJSON(item?.OldValueTitle) || {});
      return obj.FileName || obj.filename || obj.Name || obj.name || "";
    };

    // Modal (attachment)
    const attModalOpen = ref(false);
    const attModalFile = ref(null);
    const attZoom = ref(1);

    async function openAttachmentModal(item) {
      const f = getAttachment(item);
      if (!f) return;
      if (!f.url) {
        f.url = f.signedUrl = await getFreshSignedUrl(f, { transformImage: { width: 1200, resize: "contain" } });
      }
      if (f.isTxt) await loadTxtIfNeeded(f);
      attModalFile.value = f;
      attZoom.value = 1;
      attModalOpen.value = true;
    }
    function closeAttModal() { attModalOpen.value = false; }
    function zoomInAtt() { attZoom.value += 0.1; }
    function zoomOutAtt() { attZoom.value = Math.max(0.1, attZoom.value - 0.1); }

    async function attDownload(file) {
      try {
        let signed = await getFreshSignedUrl(file, { forceDownloadName: file.file?.name || "download" });
        if (!signed) throw new Error("Não foi possível gerar a URL para download.");
        const res = await fetch(signed);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file.file?.name || "download";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        console.warn("[TimeLine] Download falhou:", e);
      }
    }

    // Confirmação delete attachment
    const confirmOpen = ref(false);
    const pendingDeleteItem = ref(null);
    function requestAttDelete(item) { pendingDeleteItem.value = item; confirmOpen.value = true; }
    function cancelDelete() { confirmOpen.value = false; pendingDeleteItem.value = null; }
    async function confirmDelete() { if (pendingDeleteItem.value) { await attDelete(pendingDeleteItem.value); } cancelDelete(); }

    async function attDelete(item) {
      try {
        const key = eventKey(item);
        const f = getAttachment(item);
        if (!f) return;

        if (sb?.instance && f.bucket && f.storagePath) {
          const { error: storageErr } = await sb.instance.storage.from(f.bucket).remove([f.storagePath]);
          if (storageErr) console.warn("[TimeLine] Erro ao remover do storage:", storageErr);
        }

        if (sb?.callPostgresFunction) {
          const WorkspaceID = getVar(workspaceVarId);
          const LoggedUserID = getVar(loggedUserVarId);
          const TicketID = getVar(ticketVarId);

          const rpcBody = {
            p_action: "delete",
            p_workspace_id: WorkspaceID ?? null,
            p_ticket_id: TicketID ?? null,
            p_loggeruserid: LoggedUserID ?? null,
            p_filename: f.file?.name ?? null,
            p_fileextension: (f.file?.name?.split(".").pop() || null),
            p_filesize: f.file?.size ?? null,
            p_mimetype: f.file?.type ?? "",
            p_bucket: f.bucket ?? null,
            p_objectpath: f.storagePath ?? null,
            p_attachment_id: item?.PKTableModified ?? null,
          };

          const { error: rpcError } = await sb.callPostgresFunction({
            functionName: "postticketattachment",
            params: rpcBody,
          });
          if (rpcError) console.warn("[TimeLine] postticketattachment delete:", rpcError);
        }

        attCache.value = { ...attCache.value, [key]: { ...f, deleted: true } };
        if (attModalOpen.value) closeAttModal();
      } catch (e) {
        console.warn("[TimeLine] Falha ao excluir anexo:", e);
      }
    }

    /* ========= Menu de comentários (3 pontos) ========= */
    const openMenuKey = ref(null);
    const menuKey = (item) => item?.EventID || `${item?.CreatedDate || ""}-${item?.Title || ""}`;

    function toggleCommentMenu(item) {
      const key = menuKey(item);
      openMenuKey.value = openMenuKey.value === key ? null : key;
    }
    function isMenuOpen(item) { return openMenuKey.value === menuKey(item); }
    function closeAllMenus() { openMenuKey.value = null; }

    onMounted(() => { document.addEventListener("click", closeAllMenus); });
    onBeforeUnmount(() => { document.removeEventListener("click", closeAllMenus); });

    function editComment(item) {
      // define as variáveis pedidas
      setVar("774a34ff-ffde-414b-8e09-70a002854353", false);
      setVar("2e18d504-5152-4f25-804b-9ec53a12f260", false);
      setVar("1a931019-8209-484a-b172-73ef2c8f5675", false);
      setVar("fbb7b2ff-0120-447c-bc51-af613bffc9c0", false);

      setVar("7e74a253-7a6b-407b-95ed-14d3723a9d30", true);
      setVar("528fb0fb-dab3-41ae-8861-3e303bb217be", true);
      setVar("50a19476-dce1-4f00-a1f7-c09bdc99861c", getCommentPlain(item));
      setVar("58120ff9-9cfc-4f41-ad74-b8d0b3a11751", getCommentId(item));
      closeAllMenus();
    }

    function deleteComment(item) {
      // Emite evento para fluxo externo tratar a exclusão
      emit("trigger-event", {
        name: "timeline:commentDeleteClicked",
        event: { value: { TicketCommentID: getCommentId(item), item } },
      });
      closeAllMenus();
    }

    /* ========= MessageSent view ========= */
    function viewMessage(item) {
      setVar("7e74a253-7a6b-407b-95ed-14d3723a9d30", false);
      setVar("774a34ff-ffde-414b-8e09-70a002854353", false);
      setVar("2e18d504-5152-4f25-804b-9ec53a12f260", true);
      setVar("528fb0fb-dab3-41ae-8861-3e303bb217be", false);
      setVar("1a931019-8209-484a-b172-73ef2c8f5675", false);
      setVar("fbb7b2ff-0120-447c-bc51-af613bffc9c0", false);
      setVar("6c7b4f3b-7eb8-44c5-bad0-21d40809c902", item);
    }

    /* ========= Ícones para arquivos ========= */
    function getFileIcon(name) {
      const ext = (name.split(".").pop() || "").toLowerCase();
      switch (ext) {
        case "pdf": return "fa-solid fa-file-pdf";
        case "doc":
        case "docx": return "fa-solid fa-file-word";
        case "xls":
        case "xlsx": return "fa-solid fa-file-excel";
        case "ppt":
        case "pptx": return "fa-solid fa-file-powerpoint";
        case "txt":
        case "log": return "fa-solid fa-file-lines";
        case "json": return "fa-solid fa-code";
        default: return "fa-solid fa-file";
      }
    }

    return {
      events, containerRef, connectorWidth, validAlignment,
      // commons
      getItemIcon, formatDateUS, formatDateDash, formatDuration,
      // Activity
      getFieldValue, getResponsibleText,
      // Updated / Status
      getOldValue, getNewValue, getSideStyles,
      getOldTitle, getNewTitle,
      // ActivityUpdated
      getActivityField, getResponsibleActivityText,
      // Comments
      getCommentHtml, editComment, deleteComment, toggleCommentMenu, isMenuOpen,
      getSideCommentHtml,
      // Assignee
      getAssigneeName, getAssigneeAvatar, getInitials,
      // Attachments
      getAttachment, openAttachmentModal, closeAttModal, attDownload,
      attModalOpen, attModalFile, attZoom, zoomInAtt, zoomOutAtt,
      // Delete attachment confirm
      confirmOpen, requestAttDelete, cancelDelete, confirmDelete,
      // AttachmentDeleted
      getDeletedAttachmentName,
      // MessageSent
      getFromEmails, getToEmails, viewMessage,
      // Icons
      getFileIcon, getTicketLinkedLabel, getTicketCreatedTitle,
      isFormattedText, openFtModal, closeFtModal,
      ftModalOpen, ftModalItem, getFormattedHtml,
    };
  },
  methods: {
    onClick(item) {
      this.$emit("trigger-event", { name: "timeline:click", event: { value: item } });
    },
    onMarkerClick(item) {
      this.$emit("trigger-event", { name: "timeline:markerClick", event: { value: item } });
    },
  },
};
</script>

<style lang="scss" scoped>
  @import url("https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&family=Material+Symbols+Outlined");
  @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");

  .material-symbols-outlined {
    font-family: "Material Symbols Outlined";
    font-weight: normal;
    font-style: normal;
    font-size: 16px;
    line-height: 1;
    display: inline-block;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
  }

  .ww-timeline {
    position: relative;
    width: 100%;
    font-family: "Roboto", system-ui, -apple-system, Segoe UI, Arial, sans-serif;
    color: #0f172a;

    &--vertical {
      .ww-timeline__container {
        padding: 20px 0;
        position: relative;

        &::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 15px;
          width: var(--connector-width);
          background-color: var(--connector-color);
        }
      }

      .ww-timeline__event {
        position: relative;
        padding: 0 0 16px 48px;
        min-height: 50px;
      }

      &.ww-timeline--align-left {
        .ww-timeline__marker {
          position: absolute;
          left: 15px;
          top: 14px;
          transform: translate(-50%, 0);
        }

        .ww-timeline__content {
          text-align: left;
          display: flex;
          justify-content: flex-start;
          width: 100%;
          margin-left: 0;
        }
      }
    }

    &--horizontal {
      .ww-timeline__container {
        display: flex;
        position: relative;
        padding: 40px 20px 20px;
        overflow-x: auto;
        width: 100%;
      }

      .ww-timeline__event {
        position: relative;
        flex: 0 0 auto;
        margin: 0 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .ww-timeline__content {
        width: auto;
        flex: 0 0 auto;
      }
    }
  }

  /* marcador e ícone */
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

  .ww-timeline__content {
    cursor: pointer;
    display: flex;
    width: 100%;
  }

  .ww-timeline__content-element {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: inherit;
    height: inherit;
  }

  /* ====== CARD geral ====== */
  .activity-added-card {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    column-gap: 16px;
    row-gap: 6px;
    padding: 6px 0;

    &__left {
      min-width: 0;
      position: relative;
    }

    &__right {
      text-align: right;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
      gap: 2px;
    }

    &__title {
      font-weight: 500;
      font-size: 14px;
      color: #8c8c8d;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-row {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    &__created-by {
      font-weight: 400;
      color: #333;
      font-size: 12px;
      margin-bottom: 15px;
    }

    &__created-date {
      color: #6b7280;
      font-size: 13px;
    }

    &__list {
      margin: 0;
      padding: 0;
    }

    .row {
      display: grid;
      grid-template-columns: max-content 1fr;
      column-gap: 6px;
      align-items: baseline;
      margin: 4px 0;
    }

    dt {
      font-weight: 500;
      color: #333;
      font-size: 13.5px;
    }

    dd {
      margin: 0;
      color: #333;
      word-break: break-word;
      font-size: 13.5px;
    }

    .value-change__values {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      font-size: 13px;
    }

    .value-chip {
      padding: 6px;
      border-radius: 4px;
      background: transparent;
      color: #333;
      line-height: 1.25;
      font-size: 13px;
    }

    .value-change .arrow {
      font-size: 18px;
      color: #6b7280;
    }

    .comment-content :deep(p) {
      margin: 0 0 6px 0;
      font-size: 13.5px;
      color: #333;
    }

    .comment-content :deep(a) {
      text-decoration: underline;
    }

    .comment-content :deep(.mention) {
      background: #e8f0fe;
      border-radius: 4px;
      padding: 0 4px;
      display: inline-block;
    }

    /* Avatares assignee + hint */
    .assignee-avatars {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .assignee-avatars .arrow {
      font-size: 18px;
      color: #9ca3af;
    }

    .avatar-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      outline: none;
    }

    .avatar-badge {
      width: 24px;
      height: 24px;
      border-radius: 9999px;
      background: #4b6287;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px #fff;
      outline: 1px solid #cbd5e1;
      overflow: hidden;
    }

    .avatar-badge img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 9999px;
      display: block;
    }

    /* Popup/hint – card limpo: foto/avatar + nome */
    .avatar-hint {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translate(-50%, 6px);
      opacity: 0;
      pointer-events: none;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(16, 24, 40, .12);
      padding: 12px;
      z-index: 10;
      transition: opacity .15s ease, transform .15s ease;
    }

    .avatar-wrapper:hover .avatar-hint,
    .avatar-wrapper:focus-within .avatar-hint {
      opacity: 1;
      transform: translate(-50%, 0);
      pointer-events: auto;
    }

    .avatar-hint::before {
      content: "";
      position: absolute;
      top: -6px;
      left: 50%;
      transform: translateX(-50%) rotate(45deg);
      width: 12px;
      height: 12px;
      background: #fff;
      border-left: 1px solid #e5e7eb;
      border-top: 1px solid #e5e7eb;
    }

    .user-popcard {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 12px;
      min-width: 220px;
    }

    .user-popcard__photo {
      width: 44px;
      height: 44px;
      border-radius: 9999px;
      background: #4b6287;
      color: #fff;
      font-weight: 700;
      font-size: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px #fff;
      outline: 1px solid #cbd5e1;
      overflow: hidden;
    }

    .user-popcard__photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .user-popcard__initials {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .user-popcard__name {
      font-size: 15.5px;
      font-weight: 600;
      color: #111827;
      line-height: 1.2;
    }
  }

  /* ===== Menu de comentários (3 pontos) ===== */
  .comment-card {
    position: relative;
  }

  .comment-menu-btn {
    position: absolute;
    top: 0;
    right: 0;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    color: #9ca3af;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 6px;
    opacity: 0;
    transition: opacity .15s ease, background .15s ease;
  }

  .comment-card:hover .comment-menu-btn {
    opacity: 1;
  }

  .comment-menu-btn:hover {
    background: #f3f4f6;
    color: #6b7280;
  }

  .comment-menu {
    position: absolute;
    top: 30px;
    right: 0;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(16, 24, 40, .16);
    width: 190px;
    padding: 6px;
    z-index: 12;
  }

  .comment-menu-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    border: none;
    background: transparent;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    color: #111827;
    font-size: 14px;
  }

  .comment-menu-item i.material-symbols-outlined {
    font-size: 18px;
    color: #6b7280;
  }

  .comment-menu-item:hover {
    background: #f3f4f6;
  }

  .comment-menu-item.danger {
    color: #b91c1c;
  }

  .comment-menu-item.danger i.material-symbols-outlined {
    color: #b91c1c;
  }

  /* ===== InternalCommentEdited diff ===== */
  .comment-diff {
    display: inline-flex;
    align-items: flex-start;
    gap: 8px;
    flex-wrap: wrap;
  }

  .comment-diff .arrow {
    font-size: 18px;
    color: #9ca3af;
    align-self: center;
  }

  .comment-bubble {
    max-width: min(560px, 90%);
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 8px 10px;
    background: #fff;
  }

  .comment-bubble.old {
    background: #fafafa;
  }

  .comment-bubble .bubble-label {
    font-size: 11px;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .comment-bubble .bubble-body :deep(p) {
    margin: 0 0 6px 0;
    font-size: 13.5px;
    color: #111827;
  }

  .comment-bubble .bubble-body :deep(a) {
    text-decoration: underline;
  }

  /* ===== AttachmentAdded (thumb + nome + ações hover) ===== */
  .attachment-box {
    width: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .attach-thumb-wrap {
    position: relative;
    width: 160px;
    height: 120px;
  }

  .attach-thumb {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #f5f6fa;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
  }

  .attach-icon-wrap {
    width: 100%;
    height: 100%;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .attach-icon {
    font-size: 64px;
    color: #6b7280;
  }

  .attach-actions {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    gap: 6px;
    opacity: 0;
    pointer-events: none;
    transition: opacity .15s ease;
  }

  .attach-thumb-wrap:hover .attach-actions {
    opacity: 1;
    pointer-events: auto;
  }

  .attach-action-btn {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: rgba(0, 0, 0, .6);
    color: #fff;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .attach-action-btn i.material-symbols-outlined {
    font-size: 18px;
    color: #fff;
    line-height: 1;
  }

  .attach-action-btn.danger {
    background: rgba(220, 38, 38, .85);
  }

  .attach-name {
    max-width: 100%;
    font-size: 12px;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .attachment-box.loading .attach-skeleton {
    width: 160px;
    height: 120px;
    border-radius: 6px;
    background: #f3f4f6;
    animation: pulse 1s ease-in-out infinite;
  }

  .skeleton-line {
    width: 80%;
    height: 10px;
    background: #f3f4f6;
    border-radius: 4px;
  }

  @keyframes pulse {

    0%,
    100% {
      opacity: .7
    }

    50% {
      opacity: 1
    }
  }

  /* ===== Modal de visualização (AttachmentAdded) ===== */
  .tl-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .tl-modal-content {
    background: transparent;
    padding: 0;
    border-radius: 0;
    max-width: 80%;
    max-height: 80%;
    display: flex;
    align-items: center;
    position: relative;
  }

  .tl-modal-content.pdf-viewer {
    max-width: none;
    max-height: none;
    width: 95vw;
    height: 95vh;
  }

  .tl-modal-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-height: 100%;
    margin: 0;
    width: 100%;
    height: 100%;
  }

  .tl-modal-image {
    width: 600px;
    height: 400px;
    object-fit: contain;
    position: relative;
    z-index: 1;
  }

  .tl-modal-pdf {
    width: 100%;
    height: 100%;
    flex: 1;
    border: none;
    position: relative;
    z-index: 1;
  }

  .tl-modal-txt {
    max-width: 80vw;
    max-height: 65vh;
    overflow: auto;
    background: #0b0b0b;
    color: #eaeaea;
    padding: 12px 14px;
    border-radius: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .tl-modal-file-name {
    margin-top: 8px;
    color: #fff;
    position: relative;
    z-index: 2;
  }

  .tl-zoom-controls {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    background: rgba(0, 0, 0, .6);
    border-radius: 4px;
    padding: 5px;
    align-items: center;
    text-align: center;
    z-index: 100;
    position: relative;
  }

  .tl-zoom-button {
    border: none;
    color: #fff;
    cursor: pointer;
    font-size: 22px !important;
  }

  .tl-modal-top-actions {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 8px;
    z-index: 2;
  }

  .tl-modal-action-button {
    width: 40px;
    height: 40px;
    background: #3c3c3c;
    color: #fff;
    border: none;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .tl-modal-action-button i.material-symbols-outlined {
    font-size: 22px;
    color: #fff;
  }

/* Link "Details" ao lado do título */
.details-link {
  border: none;
  background: transparent;
  color: #2563eb;
  text-decoration: underline;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

/* View link for MessageSent */
.view-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: inherit;
  cursor: pointer;
}

.view-link i.material-symbols-outlined {
  font-size: 12px;
}

/* Modal do FORMATED_TEXT */
.ft-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

/* Container do modal: limita pela viewport e cria um "frame" fixo */
.ft-modal {
  width: min(980px, 96vw);
  /* limite por viewport (dvh melhora em mobile moderno) */
  max-height: 80vh;
  max-height: 80dvh; /* onde suportado, esta linha prevalece */
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(16,24,40,.18);
  padding: 14px;
  background: #fff;
  overflow: hidden; /* impede o container de “vazar”; o scroll fica no body */
}

/* Cabeçalho não encolhe */
.ft-modal__header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  margin-bottom: 10px;
  flex: 0 0 auto; /* importante */
}

/* Corpo ocupa o restante e rola quando necessário */
.ft-modal__body {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: flex-start;
  gap: 14px;
  padding: 6px;

  /* torna-se a área rolável */
  flex: 1 1 auto;
  min-height: 0;          /* crucial em flexbox para permitir encolher */
  overflow: auto;
  -webkit-overflow-scrolling: touch; /* rolagem suave no iOS */
}


.ft-arrow i.material-symbols-outlined {
  font-size: 22px;
  color: #9ca3af;
  align-self: center;
}

.ft-col {
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  padding: 10px;
}

.ft-col__label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 6px;
}

/* antes você tinha max-height: 64vh e overflow: auto nas colunas */
.ft-col__content {
  /* deixe o body rolar, então não limite aqui */
  max-height: none;
  overflow: visible;
  font-size: 13.5px;
  color: #111827;
}


/* garantir que conteúdos HTML se ajustem */
.ft-col__content :deep(img) { max-width: 100%; height: auto; }
.ft-col__content :deep(table) { width: 100%; border-collapse: collapse; }
.ft-col__content :deep(iframe) { max-width: 100%; }


  .tl-file-not-viewable {
    width: 600px;
    height: 400px;
    background: #fff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .tl-modal-file-icon {
    font-size: 120px;
    margin-bottom: 16px;
  }

  .tl-no-preview {
    font-size: 14px;
    color: #333;
  }

  /* ===== Popup de confirmação (delete attachment) ===== */
  .confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
  }

  .confirm-dialog {
    width: min(520px, 92vw);
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    box-shadow: 0 20px 48px rgba(16, 24, 40, .18);
    padding: 16px;
  }

  .confirm-header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: start;
    gap: 12px;
  }

  .confirm-icon {
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    background: #fef3c7;
    color: #b45309;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .confirm-icon i.material-symbols-outlined {
    font-size: 22px;
  }

  .confirm-title {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .confirm-subtitle {
    font-size: 14px;
    color: #374151;
    margin-top: 2px;
  }

  .confirm-close {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 4px;
    color: #6b7280;
    border-radius: 6px;
  }

  .confirm-close:hover {
    background: #f3f4f6;
  }

  .confirm-actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .btn {
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 14px;
    cursor: pointer;
  }

  .btn-light {
    background: #fff;
    border-color: #e5e7eb;
    color: #111827;
  }

  .btn-light:hover {
    background: #f9fafb;
  }

  .btn-danger {
    background: #dc2626;
    color: #fff;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  /* 1) alinhar o centro do marcador à primeira linha do título */
.ww-timeline--vertical .ww-timeline__marker {
  top: 0; /* era 14px */
}

/* 2) garantir que o título tenha a mesma “altura de faixa” do marcador
      (o texto fica centralizado verticalmente em 30px) */
.activity-added-card__title {
  min-height: 30px;            /* mesma altura do marcador */
  display: inline-flex;
  align-items: center;          /* centraliza o texto na faixa */
  margin-bottom: 8px;           /* mantém o espaçamento existente */
  margin-top: 5px;           /* mantém o espaçamento existente */
}

/* (opcional) se algum card estiver com botão/ícone no título,
   mantenha tudo no mesmo eixo */
.activity-added-card__title.title-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}


  /* Chip do TicketLinked (ex.: "Incidente #250") */
.link-badge{
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 6px;
  background: #e5e7eb;   /* cinza claro */
  color: #374151;        /* cinza escuro do texto */
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

</style>
