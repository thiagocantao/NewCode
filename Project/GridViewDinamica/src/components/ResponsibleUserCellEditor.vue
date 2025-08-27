<template>
  <div class="responsible-user-editor">
    <UserSelector
      ref="selector"
      :datasource="options"
      group-by="type"
      :selected-user-id="params.value"
      @user-selected="onSelected"
    />
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';
import UserSelector from './UserSelector.vue';


export default {
  name: 'ResponsibleUserCellEditor',
  components: { UserSelector },
  props: {
    params: { type: Object, required: true }
  },
  setup(props) {
    const options = ref([]);
    const value = ref(props.params.value || null);
    const selector = ref(null);

    const getProp = (obj, ...keys) => {
      for (const key of keys) {
        const match = Object.keys(obj || {}).find(
          k => k.toLowerCase() === String(key).toLowerCase()
        );
        if (match) return obj[match];
      }
      return undefined;
    };

    const mapOptions = list => {
      const arr = Array.isArray(list) ? list : [];
      const hasNested = arr.some(it => Array.isArray(getProp(it, 'groupUsers')) && getProp(it, 'groupUsers').length);
      if (hasNested) {
        return arr.map(item => {
          const children = getProp(item, 'groupUsers');
          return {
            ...item,
            id: getProp(item, 'id', 'value'),
            name: getProp(item, 'name', 'label'),
            value: getProp(item, 'value', 'id'),
            label: getProp(item, 'label', 'name'),
            ...(Array.isArray(children) && children.length ? { groupUsers: mapOptions(children) } : {})
          };
        });
      }

      const groups = {};
      const users = [];
      for (const raw of arr) {
        const id = getProp(raw, 'id', 'value');
        const name = getProp(raw, 'name', 'label');
        const type = String(getProp(raw, 'type') || '').toLowerCase();
        if (type === 'group') {
          groups[id] = { ...raw, id, name, value: id, label: name, groupUsers: [] };
        } else {
          const gid = getProp(raw, 'groupId', 'groupid', 'group_id', 'group');
          users.push({ ...raw, id, name, value: id, label: name, groupId: gid });
        }
      }

      const result = Object.values(groups);
      for (const usr of users) {
        const gid = usr.groupId;
        delete usr.groupId;
        if (gid != null && groups[gid]) groups[gid].groupUsers.push(usr);
        else result.push(usr);
      }
      return result;
    };


    const loadOptions = async () => {
      if (props.params.options && props.params.options.length) {
        options.value = mapOptions(props.params.options);
        return;
      }
      try {
        const lang = window.wwLib?.wwVariable?.getValue('aa44dc4c-476b-45e9-a094-16687e063342');
        const companyId = window.wwLib?.wwVariable?.getValue('5d099f04-cd42-41fd-94ad-22d4de368c3a');
        const apiUrl = window.wwLib?.wwVariable?.getValue('1195995b-34c3-42a5-b436-693f0f4f8825');
        const apiKey = window.wwLib?.wwVariable?.getValue('d180be98-8926-47a7-b7f1-6375fbb95fa3');
        const apiAuth = window.wwLib?.wwVariable?.getValue('dfcde09f-42f3-4b5c-b2e8-4314650655db');


        if (!apiUrl) {
          options.value = [];
          return;
        }


        const fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(companyId ? { p_idcompany: companyId } : {}),
            ...(lang ? { p_language: lang } : {})
          })
        };
        if (apiKey) fetchOptions.headers['apikey'] = apiKey;
        if (apiAuth) fetchOptions.headers['Authorization'] = apiAuth;

        const baseUrl = apiUrl.endsWith('/') ? apiUrl : apiUrl + '/';
        const response = await fetch(baseUrl + 'getLookupGroupsAndUsers', fetchOptions);
        const data = await response.json();
        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.result)
              ? data.result
              : Array.isArray(data?.results)
                ? data.results
                : [];
        options.value = mapOptions(raw);

      } catch (e) {
        options.value = [];
      }
    };

    const onSelected = (val) => {
      value.value = val;

      const meta = selector.value;
      const colId = props.params.column?.getColId
        ? props.params.column.getColId()
        : props.params.column?.colId;

      if (props.params.node?.setDataValue) {
        props.params.node.setDataValue(colId, val);
      } else if (props.params.data && colId != null) {
        props.params.data[colId] = val;
      }

      if (props.params.data && meta) {
        props.params.data.ResponsibleUser = meta.selectedUser?.name || null;
        props.params.data.AssignedGroupName = meta.selectedGroup?.name || null;
      }

      if (props.params.api?.refreshCells) {
        props.params.api.refreshCells({
          rowNodes: props.params.node ? [props.params.node] : undefined,
          columns: colId ? [colId] : undefined,
          force: true
        });
      }

      if (props.params.api && props.params.api.stopEditing) {
        props.params.api.stopEditing();
      } else if (props.params.stopEditing) {
        props.params.stopEditing();
      }
    };

    const getValue = () => value.value;
    const isPopup = () => true;

    onMounted(async () => {
      await loadOptions();
      nextTick(() => {
        selector.value && selector.value.toggleDropdown && selector.value.toggleDropdown();
      });
    });

    return { options, onSelected, getValue, isPopup, selector };
  }
};
</script>

<style scoped>
.responsible-user-editor {
  min-width: 220px;
}
</style>

