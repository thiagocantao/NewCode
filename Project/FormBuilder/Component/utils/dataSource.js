export const LIST_FIELD_TYPES = ['SIMPLE_LIST', 'LIST', 'CONTROLLED_LIST'];

export function normalizeFieldDataSource(fieldOrSource) {
  if (!fieldOrSource) return null;

  const rawDataSource =
    fieldOrSource.dataSource !== undefined || fieldOrSource.DataSource !== undefined
      ? fieldOrSource.dataSource ?? fieldOrSource.DataSource ?? null
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

export function getPlatformContext() {
  if (typeof window === 'undefined') {
    return {
      lang: null,
      companyId: null,
      apiUrl: '',
      apiKey: null,
      apiAuth: null
    };
  }

  const getValue = window.wwLib?.wwVariable?.getValue?.bind(window.wwLib.wwVariable);

  const safeGet = key => {
    try {
      return getValue ? getValue(key) : null;
    } catch (err) {
      console.warn('Failed to read platform variable', key, err);
      return null;
    }
  };

  return {
    lang: safeGet('aa44dc4c-476b-45e9-a094-16687e063342'),
    companyId: safeGet('5d099f04-cd42-41fd-94ad-22d4de368c3a'),
    apiUrl: safeGet('1195995b-34c3-42a5-b436-693f0f4f8825') || '',
    apiKey: safeGet('d180be98-8926-47a7-b7f1-6375fbb95fa3'),
    apiAuth: safeGet('dfcde09f-42f3-4b5c-b2e8-4314650655db')
  };
}

export async function fetchDataSourceOptions(rawDataSource, context) {
  if (typeof window === 'undefined') {
    return [];
  }

  const dataSource = normalizeFieldDataSource(rawDataSource);
  if (!dataSource) {
    return [];
  }

  const {
    lang,
    companyId,
    apiUrl = '',
    apiKey,
    apiAuth
  } = context || getPlatformContext();

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.apikey = apiKey;
  if (apiAuth) headers.Authorization = apiAuth;

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
    if (rawMethod && rawMethod.toUpperCase() === 'GET') {
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
      ...(lang ? { p_language: lang } : {})
    });
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const dataArray = extractArrayFromResponse(data);

  if (!Array.isArray(dataArray)) {
    return [];
  }

  const options = mapOptionsFromData(dataArray, dataSource);

  return options.sort((a, b) => {
    if (typeof a.label === 'string' && typeof b.label === 'string') {
      return a.label.localeCompare(b.label);
    }
    return 0;
  });
}

export function shouldLoadDataSource(field) {
  if (!field) return false;
  return LIST_FIELD_TYPES.includes(field.fieldType) && hasFetchableDataSource(field);
}

export default {
  LIST_FIELD_TYPES,
  normalizeFieldDataSource,
  hasFetchableDataSource,
  combineUrl,
  extractArrayFromResponse,
  mapOptionsFromData,
  getPlatformContext,
  fetchDataSourceOptions,
  shouldLoadDataSource
};
