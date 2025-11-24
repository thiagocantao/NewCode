export const LIST_FIELD_TYPES = ['SIMPLE_LIST', 'LIST', 'CONTROLLED_LIST'];

export function normalizeFieldDataSource(fieldOrSource) {
  if (!fieldOrSource) return null;

  const rawDataSource =
    fieldOrSource.dataSource !== undefined ||
    fieldOrSource.DataSource !== undefined ||
    fieldOrSource.data_source !== undefined ||
    fieldOrSource.Data_Source !== undefined
      ? fieldOrSource.dataSource ??
        fieldOrSource.DataSource ??
        fieldOrSource.data_source ??
        fieldOrSource.Data_Source ??
        null
      : fieldOrSource;

  if (!rawDataSource) return null;

  if (typeof rawDataSource !== 'object') {
    return rawDataSource;
  }

  const transform = rawDataSource.transform ?? rawDataSource.Transform ?? null;
  const method = rawDataSource.method ?? rawDataSource.Method ?? undefined;
  const valueField = rawDataSource.valueField ?? rawDataSource.ValueField ?? undefined;
  const labelField = rawDataSource.labelField ?? rawDataSource.LabelField ?? undefined;
  const functionName = rawDataSource.functionName ?? rawDataSource.FunctionName ?? undefined;
  const url = rawDataSource.url ?? rawDataSource.Url ?? undefined;

  return {
    ...rawDataSource,
    ...(transform ? { transform } : {}),
    ...(method ? { method } : {}),
    ...(valueField ? { valueField } : {}),
    ...(labelField ? { labelField } : {}),
    ...(functionName ? { functionName } : {}),
    ...(url ? { url } : {})
  };
}

export function hasFetchableDataSource(fieldOrSource) {
  const normalized = normalizeFieldDataSource(fieldOrSource);

  if (!normalized) {
    return false;
  }

  if (typeof normalized === 'string') {
    return normalized.trim().length > 0;
  }

  if (typeof normalized !== 'object') {
    return false;
  }

  const functionName = normalized.functionName ?? normalized.FunctionName;
  const url = normalized.url ?? normalized.Url;

  return (
    (typeof functionName === 'string' && functionName.trim().length > 0) ||
    (typeof url === 'string' && url.trim().length > 0)
  );
}

export function combineUrl(baseUrl, path) {
  if (!path) return baseUrl || '';
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const sanitizedBase = (baseUrl || '').replace(/\/+$/, '');
  const sanitizedPath = path.replace(/^\/+/, '');

  if (!sanitizedBase) {
    return `/${sanitizedPath}`;
  }

  return `${sanitizedBase}/${sanitizedPath}`;
}

export function extractArrayFromResponse(payload, visited = new WeakSet()) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (visited.has(payload)) {
    return null;
  }

  visited.add(payload);

  const priorityKeys = [
    'items',
    'data',
    'results',
    'value',
    'values',
    'options',
    'records',
    'list',
    'rows',
    'collection'
  ];

  for (const key of priorityKeys) {
    if (Array.isArray(payload?.[key])) {
      return payload[key];
    }
  }

  for (const key of Object.keys(payload)) {
    const value = payload[key];
    const result = extractArrayFromResponse(value, visited);
    if (Array.isArray(result)) {
      return result;
    }
  }

  return null;
}

export function mapOptionsFromData(dataArray, dataSource) {
  if (!Array.isArray(dataArray)) {
    return [];
  }

  const transform =
    dataSource && typeof dataSource === 'object'
      ? dataSource.transform ?? dataSource.Transform ?? null
      : null;

  if (transform && (transform.value || transform.label)) {
    return dataArray
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const value = item?.[transform.value] ?? item?.id ?? item?.ID;
        const label = item?.[transform.label] ?? item?.name ?? item?.Name;
        if (value === undefined || label === undefined) {
          return null;
        }
        return { value, label };
      })
      .filter(option => option !== null);
  }

  const valueField =
    (dataSource && typeof dataSource === 'object' && (dataSource.valueField ?? dataSource.ValueField)) ||
    'id';
  const labelField =
    (dataSource && typeof dataSource === 'object' && (dataSource.labelField ?? dataSource.LabelField)) ||
    'name';

  return dataArray
    .map(item => {
      if (!item || typeof item !== 'object') {
        const primitiveValue = item;
        if (primitiveValue === undefined || primitiveValue === null) {
          return null;
        }
        const normalized = String(primitiveValue);
        return { value: primitiveValue, label: normalized };
      }

      const value = item?.[valueField] ?? item?.id ?? item?.ID;
      const label = item?.[labelField] ?? item?.name ?? item?.Name;

      if (value === undefined || label === undefined) {
        return null;
      }

      return { value, label };
    })
    .filter(option => option !== null);
}

export function parseListOptions(listOptions) {
  if (typeof listOptions !== 'string' || !listOptions.trim()) {
    return [];
  }

  return listOptions
    .split(',')
    .map(opt => {
      const trimmed = opt.trim();
      if (!trimmed) return null;
      return { value: trimmed, label: trimmed };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getDefaultPlatformContext() {
  if (typeof window === 'undefined') {
    return { workspaceId: null, userId: null };
  }

  const safeGet = key => {
    try {
      return window?.wwLib?.wwVariable?.getValue?.(key) ?? null;
    } catch (err) {
      console.warn('[CADASTROSFormRender] Failed to read variable', key, err);
      return null;
    }
  };

  return {
    workspaceId: safeGet('744511f1-3309-41da-a9fd-0721e7dd2f99'),
    userId: safeGet('fc54ab80-1a04-4cfe-a504-793bdcfce5dd')
  };
}

export async function fetchDataSourceOptions(rawDataSource, context = {}) {
  if (typeof window === 'undefined') {
    return [];
  }

  const dataSource = normalizeFieldDataSource(rawDataSource);
  if (!dataSource) {
    return [];
  }

  const {
    apiUrl = '',
    apiKey,
    apiAuthorization,
    ticketId = null,
    companyId = null,
    language = null,
    workspaceId = null,
    userId = null
  } = { ...getDefaultPlatformContext(), ...context };

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.apikey = apiKey;
  if (apiAuthorization) headers.Authorization = apiAuthorization;

  let url = '';
  let method = 'POST';

  if (typeof dataSource === 'string') {
    if (!dataSource.trim()) {
      return [];
    }
    url = combineUrl(apiUrl, dataSource);
  } else if (dataSource.url) {
    url = combineUrl(apiUrl, dataSource.url);
    const rawMethod = dataSource.method ?? dataSource.Method;
    if (rawMethod && String(rawMethod).toUpperCase() === 'GET') {
      method = 'GET';
    }
  } else if (dataSource.functionName) {
    url = combineUrl(apiUrl, dataSource.functionName);
  } else {
    return [];
  }

  const fetchOptions = { method, headers };
  if (method !== 'GET') {
    fetchOptions.body = JSON.stringify({
      ...(companyId ? { p_idcompany: companyId } : {}),
      ...(language ? { p_language: language } : {}),
      p_ticketid: ticketId,
      ...(workspaceId ? { p_workspaceid: workspaceId } : {}),
      ...(userId ? { p_userid: userId } : {})
    });
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const dataArray = extractArrayFromResponse(data) ?? data;
  const options = mapOptionsFromData(Array.isArray(dataArray) ? dataArray : [], dataSource);

  return options.sort((a, b) => {
    if (typeof a.label === 'string' && typeof b.label === 'string') {
      return a.label.localeCompare(b.label);
    }
    return 0;
  });
}

export default {
  LIST_FIELD_TYPES,
  normalizeFieldDataSource,
  hasFetchableDataSource,
  parseListOptions,
  combineUrl,
  extractArrayFromResponse,
  mapOptionsFromData,
  fetchDataSourceOptions
};
