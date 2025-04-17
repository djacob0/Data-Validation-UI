export const standardizeHeader = (name) => (name || '').toString().trim().toUpperCase();

export const cleanText = (text) => {
  if (text === null || text === undefined) return "";
  return text.toString()
    .replace(/[^a-zA-Z0-9\s\-.,]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const validationRules = [
  {
    name: 'requiredFields',
    fields: ['FIRSTNAME', 'LASTNAME', 'RSBSASYSTEMGENERATEDNUMBER', 'SEX', 'BIRTHDATE'],
    validate: (row, field) => !row[field] && row[field] !== 0,
    message: (field) => `MISSING ${field}`
  },
  {
    name: 'nameLength',
    fields: ['FIRSTNAME', 'LASTNAME'],
    validate: (row, field) => row[field] && row[field].toString().trim().length < 2,
    message: (field) => `INVALID ${field} (TOO SHORT)`
  },
  {
    name: 'nameFormat',
    fields: ['FIRSTNAME', 'MIDDLENAME', 'LASTNAME'],
    validate: (row, field) => row[field] && /[ñÑ]/.test(row[field]),
    message: (field) => `INVALID ${field} (CONTAINS Ñ/ñ)`
  },
  {
    name: 'extensionName',
    fields: ['EXTENSIONNAME'],
    validate: (row, field) => row[field] && /[#@$%^&*ñÑ]/.test(row[field]),
    message: () => 'INVALID EXTENSIONNAME (SPECIAL CHARS)'
  },
  {
    name: 'motherMaidenName',
    fields: ['MOTHERMAIDENNAME'],
    validate: (row, field) => row[field] && /[.#@$%^&*ñÑ]/.test(row[field]),
    message: () => 'INVALID MOTHERMAIDENNAME (SPECIAL CHARS)'
  },
  {
    name: 'dateFormat',
    fields: ['BIRTHDATE'],
    validate: (row, field) => row[field] && !/^\d{4}-\d{2}-\d{2}$/.test(row[field]),
    message: () => 'INVALID DATE FORMAT'
  },
  {
    name: 'systemNumberFormat',
    fields: ['RSBSASYSTEMGENERATEDNUMBER'],
    validate: (row, field) => row[field] && !/^\d{2}-\d{3}-\d{2}-\d{3}-\d{6}$/.test(row[field]),
    message: () => 'INVALID RSBSA NUMBER'
  },
  {
    name: 'gender',
    fields: ['SEX'],
    validate: (row, field) => row[field] && !['MALE', 'FEMALE'].includes(row[field].toUpperCase()),
    message: () => 'INVALID GENDER'
  },  
  // {
  //   name: 'extensionNameValidList',
  //   fields: ['EXTENSIONNAME'],
  //   validate: (row, field) => row[field] && !['JR', 'SR', 'II', 'III', 'IV', 'V'].includes(row[field].toUpperCase()),
  //   message: () => 'INVALID EXTENSIONNAME (NOT ALLOWED VALUE)'
  // },  
  {
    name: 'addressFields',
    fields: ['STREETNO_PUROKNO', 'BARANGAY', 'CITYMUNICIPALITY', 'PROVINCE', 'REGION'],
    validate: (row, field) => row[field] && /[#@$%^&*ñÑ]/.test(row[field]),
    message: (field) => `INVALID ${field} (SPECIAL CHARS)`
  }
];

export const validateData = (rows) => {
  const nameMap = new Map();
  const systemNumberMap = new Map();
  const invalidRows = [];
  const validRows = [];

  rows.forEach(row => {

    const sysNum = row.RSBSASYSTEMGENERATEDNUMBER;
    if (sysNum) {
      if (!systemNumberMap.has(sysNum)) {
        systemNumberMap.set(sysNum, []);
      }
      systemNumberMap.get(sysNum).push(row);
    }

    const nameKey = `${row.FIRSTNAME || ''}_${row.MIDDLENAME || ''}_${row.LASTNAME || ''}_${row.EXTENSIONNAME || ''}`.toLowerCase();
    if (!nameMap.has(nameKey)) {
      nameMap.set(nameKey, []);
    }
    nameMap.get(nameKey).push(row);
  });

  rows.forEach((row) => {
    const remarks = [];
    let hasErrors = false;

    validationRules.forEach(rule => {
      rule.fields.forEach(field => {
        if (rule.validate(row, field)) {
          remarks.push(rule.message(field));
          hasErrors = true;
        }
      });
    });

    const sysNum = row.RSBSASYSTEMGENERATEDNUMBER;
    if (sysNum && systemNumberMap.get(sysNum)?.length > 1) {
      remarks.push('DUPLICATE SYSTEM NUMBER');
      hasErrors = true;
    }

    const nameKey = `${row.FIRSTNAME || ''}_${row.MIDDLENAME || ''}_${row.LASTNAME || ''}_${row.EXTENSIONNAME || ''}`.toLowerCase();
    const namesakes = nameMap.get(nameKey) || [];
    
    if (namesakes.length > 1) {
      const isDuplicate = namesakes.some(other => 
        other !== row && 
        (
          (other.RSBSASYSTEMGENERATEDNUMBER && other.RSBSASYSTEMGENERATEDNUMBER === row.RSBSASYSTEMGENERATEDNUMBER) ||
          (other.BIRTHDATE === row.BIRTHDATE && 
           other.MOTHERMAIDENNAME === row.MOTHERMAIDENNAME)
        )
      );
      
      if (isDuplicate) {
        remarks.push('DUPLICATE NAME');
        hasErrors = true;
      }
    }

    if (hasErrors) {
      invalidRows.push({ ...row, Remarks: remarks.join(' | ') });
    } else {
      validRows.push(row);
    }
  });

  return { validRows, invalidRows };
};