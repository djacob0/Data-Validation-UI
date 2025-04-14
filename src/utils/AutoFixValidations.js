export const standardizeHeader = (name) => (name || '').toString().trim().toUpperCase();

export const cleanText = (text, preserveSpaces = true) => {
  if (!text) return text;
  
  let cleaned = text.toString()
    .replace(/Ñ/g, 'N')
    .replace(/ñ/g, 'n')
    .replace(/[^a-zA-Z0-9\s\-.,]/g, '');
  if (preserveSpaces) {
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  } else {
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  return cleaned;
};

export const cleanNameText = (text) => {
  if (!text) return text;
  return text.toString()
    .replace(/[^a-zA-Z\s-]/g, '')
    .replace(/\s{2,}/g, ' ') 
    .trim();
};

export const formatMobile = (num) => {
  if (!num) return num;
  const digits = num.toString().replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('0') ? digits.substring(1) : digits;
};

export const formatGender = (gender) => {
  if (!gender) return gender;
  const g = gender.toString().toUpperCase();
  if (g === 'M' || g === 'MALE') return 'MALE';
  if (g === 'F' || g === 'FEMALE') return 'FEMALE';
  return g;
};

export const cleanMiddleName = (name) => {
  if (!name) return '';
  let cleaned = cleanNameText(name);
  const lower = cleaned.toLowerCase();
  return ['n/a', 'na', 'not applicable', ''].includes(lower) ? '' : cleaned;
};

export const cleanExtensionName = (name) => {
  if (!name) return '';
  return name.toString()
    .replace(/\./g, '')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
};

export const cleanMotherMaidenName = (name) => {
  if (!name) return '';
  let cleaned = name.toString()
    .replace(/[^a-zA-Z\s\-']/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const lower = cleaned.toLowerCase();
  return ['n/a', 'na', 'not applicable', ''].includes(lower) ? '' : cleaned;
};

export const formatRegion = (region) => {
  if (!region) return region;
  const cleaned = region.replace(/\(.*?\)/g, '').trim();
  const regionMap = {
    'REGION I': 'REGION I ILOCOS REGION', 'REGION II': 'REGION II CAGAYAN VALLEY', 
    'REGION III': 'REGION III CENTRAL LUZON', 'REGION IV-A': 'REGION IV-A CALABARZON',
    'REGION IV-B': 'REGION IV-B MIMAROPA', 'REGION V': 'REGION V BICOL REGION', 
    'REGION VI': 'REGION VI WESTERN VISAYAS','REGION VII': 'REGION VII CENTRAL VISAYAS',
    'REGION VIII': 'REGION VIII EASTERN VISAYAS', 'REGION IX': 'REGION IX ZAMBOANGA PENINSULA', 
    'REGION X': 'REGION X NORTHERN MINDANAO', 'REGION XI': 'REGION XI DAVAO REGION',
    'REGION XII': 'REGION XII SOCCSKSARGEN', 'REGION XIII': 'REGION XIII CARAGA', 
    'BARMM': 'BARMM BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO', 
    'CAR': 'CAR CORDILLERA ADMINISTRATIVE REGION',
    'NCR': 'NCR NATIONAL CAPITAL REGION',
  };    
  return regionMap[cleaned] || cleaned;
};

export const validateSystemNumber = (num) => {
  if (!num) return false;
  return /^\d{2}-\d{2}-\d{2}-\d{3}-\d{6}$/.test(num.toString());
};  

export const validateIdNumber = (id, type) => {
  if (!id) return false;
  if (type && type.toString().toUpperCase().includes('BARANGAY')) {
    return id.toString().toUpperCase() === 'BARANGAY CERTIFICATE';
  }
  return true;
};

export const validateProvince = (province) => {
  if (!province) return false;
  return !/[#@$%^&*]/.test(province.toString());
};

export const validateCityMunicipality = (cityMunicipality) => {
  if (!cityMunicipality) return false;
  return !/[#@$%^&*]/.test(cityMunicipality.toString());
};

// Main validation function
export const validateData = (data, headers, autoFixOptions = {}) => {
  const errors = [];
  const warnings = [];
  const validRows = [];
  const invalidRows = [];
  const cellErrors = {};

  const noSpecialCharsFields = [
    'STREETNO_PUROKNO', 'BARANGAY', 'CITYMUNICIPALITY', 'DISTRICT',
    'PROVINCE', 'REGION', 'PLACEOFBIRTH', 'NATIONALITY', 'PROFESSION',
    'SOURCEOFFUNDS', 'MOTHERMAIDENNAME', 'NOOFFARMPARCEL'
  ];

  const requiredFields = ['FIRSTNAME', 'LASTNAME', 'RSBSASYSTEMGENERATEDNUMBER', 'SEX', 'BIRTHDATE'];
  
  for (let arrayIndex = 1; arrayIndex < data.length; arrayIndex++) {
    const fileRowNumber = arrayIndex;
    const row = data[arrayIndex];
    const rowErrors = [];
    const rowWarnings = [];
    const rowData = {};
    let hasErrors = false;

    headers.forEach((header, colIndex) => {
      const originalColNumber = colIndex + 1;
      let value = row[colIndex];
      const stdHeader = standardizeHeader(header);
      rowData[stdHeader] = value;

      // Apply auto-fixes if enabled
      if (autoFixOptions.cleanSpecialChars) {
        value = cleanText(value);
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      if (autoFixOptions.formatMobileNumbers && stdHeader === 'MOBILENO') {
        value = formatMobile(value);
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      if (autoFixOptions.standardizeGender && stdHeader === 'SEX') {
        value = formatGender(value);
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      if (autoFixOptions.cleanMiddleNames && stdHeader === 'MIDDLENAME') {
        value = cleanMiddleName(value);
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      if (autoFixOptions.cleanSpaces && ['FIRSTNAME', 'LASTNAME'].includes(stdHeader)) {
        value = (value || '').toString().replace(/\s{2,}/g, ' ').trim();
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      if (autoFixOptions.standardizeRegion && stdHeader === 'REGION') {
        value = formatRegion(value);
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      if (autoFixOptions.cleanMotherMaidenName && stdHeader === 'MOTHERMAIDENNAME') {
        value = cleanMotherMaidenName(value);
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      if (autoFixOptions.cleanExtensionName && stdHeader === 'EXTENSIONNAME') {
        value = cleanExtensionName(value);
        row[colIndex] = value;
        rowData[stdHeader] = value;
      }

      // Validation checks
      if (requiredFields.includes(stdHeader)) {
        if (!value) {
          const error = {
            field: header,
            message: 'Required field is empty',
            value,
            row: fileRowNumber,
            column: originalColNumber
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }
      }

      if (value && noSpecialCharsFields.includes(stdHeader)) {
        const hasSpecialChars = /[^a-zA-Z0-9\s\-.,]/.test(value.toString());
        if (hasSpecialChars) {
          const error = {
            field: header,
            message: 'Contains invalid special characters',
            value,
            row: fileRowNumber,
            column: originalColNumber
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }
      }

      if (value) {
        if (['FIRSTNAME', 'LASTNAME', 'MIDDLENAME'].includes(stdHeader)) {
          const hasInvalidChars = /[^a-zA-Z\s-]/.test(value.toString());
          if (hasInvalidChars) {
            const error = {
              field: header,
              message: 'Contains invalid characters (only letters, spaces and hyphens allowed)',
              value,
              row: fileRowNumber,
              column: originalColNumber
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }
          
          if (value.replace(/\s/g, '').length < 2) {
            const error = {
              field: header,
              message: 'Must be at least 2 characters',
              value,
              row: fileRowNumber,
              column: originalColNumber
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }
          
          if (/\d/.test(value)) {
            const error = {
              field: header,
              message: 'Contains numbers (only letters allowed)',
              value,
              row: fileRowNumber,
              column: originalColNumber
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }

          if (/\s{2,}/.test(value)) {
            rowWarnings.push({
              field: header,
              message: 'Extra spaces detected',
              value,
              row: fileRowNumber,
              column: originalColNumber
            });
          }
        }

        if (stdHeader === 'RSBSASYSTEMGENERATEDNUMBER' && !validateSystemNumber(value)) {
          const error = {
            field: header,
            message: 'Invalid system number (numbers only)',
            value,
            row: fileRowNumber,
            column: originalColNumber
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }

        if (stdHeader === 'IDNUMBER') {
          const idType = rowData['GOVTIDTYPE']?.toString().toUpperCase().trim();
          
          if (idType === 'BARANGAY CERTIFICATE') {
            if (value.toString().toUpperCase().trim() !== 'BARANGAY CERTIFICATE') {
              const error = {
                field: header,
                message: 'Must be exactly "Barangay Certificate" when ID type is Barangay Certificate',
                value,
                row: fileRowNumber,
                column: originalColNumber
              };
              rowErrors.push(error);
              cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
              hasErrors = true;
            }
          }
        }

        if (stdHeader === 'MOBILENO') {
          const digits = value.toString().replace(/\D/g, '');
          if (digits.length !== 10) {
            const error = {
              field: header,
              message: 'Mobile number must be 10 digits',
              value,
              row: fileRowNumber,
              column: originalColNumber
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }
        }

        if (stdHeader === 'SEX' && !['MALE', 'FEMALE'].includes(value.toString().toUpperCase())) {
          const error = {
            field: header,
            message: 'Invalid gender (must be MALE or FEMALE)',
            value,
            row: fileRowNumber,
            column: originalColNumber
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }

        if (stdHeader === 'BIRTHDATE') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const error = {
              field: header,
              message: 'Invalid date format (YYYY-MM-DD required)',
              value,
              row: fileRowNumber, 
              column: originalColNumber 
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          } else {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            
            if (age < 18 || age > 100) {
              const error = {
                field: header,
                message: `Age must be 18-100 (current: ${age})`,
                value,
                row: fileRowNumber,
                column: originalColNumber 
              };
              rowErrors.push(error);
              cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
              hasErrors = true;
            }
          }
        }

        if (stdHeader === 'MOTHERMAIDENNAME') {
          const cleanedValue = cleanMotherMaidenName(value);
          if (cleanedValue !== value.toString().trim()) {
            rowWarnings.push({
              field: header,
              message: 'Special characters detected and cleaned',
              value: value,
              row: fileRowNumber,
              column: originalColNumber 
            });
            row[colIndex] = cleanedValue;
            rowData[stdHeader] = cleanedValue;
          }
        }
        
        if (stdHeader === 'EXTENSIONNAME' && value && /[.]/.test(value)) {
          rowWarnings.push({
            field: header,
            message: 'Remove periods from extension name',
            value,
            row: fileRowNumber, 
            column: originalColNumber
          });
        }
        
        if (stdHeader === 'PROVINCE' && !validateProvince(value)) {
          const error = {
            field: header,
            message: 'Invalid province format (special characters not allowed)',
            value,
            row: fileRowNumber, 
            column: originalColNumber 
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      invalidRows.push({
        row: fileRowNumber,
        data: rowData,
        errors: rowErrors,
        warnings: rowWarnings
      });
      errors.push(...rowErrors);
    } else {
      validRows.push({
        row: fileRowNumber,
        data: rowData
      });
    }
    
    warnings.push(...rowWarnings);
  }

  return { errors, warnings, validRows, invalidRows, cellErrors };
};

// Auto-fix functions
export const applyAutoFix = (data, headers, type) => {
  const newData = [...data];
  
  newData.forEach((row, rowIndex) => {
    if (rowIndex === 0) return; // Skip header row
    
    headers.forEach((header, colIndex) => {
      const stdHeader = standardizeHeader(header);
      let value = row[colIndex];
      
      switch(type) {
        case 'specialChars':
          if (['FIRSTNAME', 'LASTNAME', 'MIDDLENAME'].includes(stdHeader)) {
            value = cleanNameText(value);
          } else {
            value = cleanText(value);
          }
          break;
        case 'mobile':
          if (stdHeader === 'MOBILENO') {
            value = formatMobile(value);
          }
          break;
        case 'gender':
          if (stdHeader === 'SEX') {
            value = formatGender(value);
          }
          break;
        case 'spaces':
          if (['FIRSTNAME', 'LASTNAME'].includes(stdHeader)) {
            value = value.replace(/\s{2,}/g, ' ').trim();
          }
          break;
        case 'middlename':
          if (stdHeader === 'MIDDLENAME') {
            value = cleanMiddleName(value);
          }
          break;
        case 'motherMaiden':
          if (stdHeader === 'MOTHERMAIDENNAME') {
            value = cleanMotherMaidenName(value);
          }
          break;
        case 'extension':
          if (stdHeader === 'EXTENSIONNAME') {
            value = cleanExtensionName(value);
          }
          break;
        case 'region':
          if (stdHeader === 'REGION') {
            value = formatRegion(value);
          }
          break;
        case 'barangayId':
          if (stdHeader === 'IDNUMBER') {
            const govtIdType = row[headers.indexOf('GOVTIDTYPE')]?.toString().toUpperCase().trim();
            if (govtIdType === 'BARANGAY CERTIFICATE') {
              value = 'Barangay Certificate';
            }
          }
          break;
        default:
          break;
      }
      
      row[colIndex] = value;
    });
  });
  
  return newData;
};

export const applyAllFixes = (data, headers) => {
  const newData = [...data];
  
  newData.forEach((row, rowIndex) => {
    if (rowIndex === 0) return;
    
    headers.forEach((header, colIndex) => {
      const stdHeader = standardizeHeader(header);
      let value = row[colIndex];
      
      value = cleanText(value);
      
      if (stdHeader === 'MOBILENO') {
        value = formatMobile(value);
      }
      
      if (stdHeader === 'SEX') {
        value = formatGender(value);
      }
      
      if (['FIRSTNAME', 'LASTNAME'].includes(stdHeader)) {
        value = value.replace(/\s{2,}/g, ' ').trim();
      }
      
      if (stdHeader === 'MIDDLENAME') {
        value = cleanMiddleName(value);
      }
      
      if (stdHeader === 'MOTHERMAIDENNAME') {
        value = cleanMotherMaidenName(value);
      }
      
      if (stdHeader === 'EXTENSIONNAME') {
        value = cleanExtensionName(value);
      }
      
      if (stdHeader === 'REGION') {
        value = formatRegion(value);
      }
      
      row[colIndex] = value;
    });
  });
  
  return newData;
};