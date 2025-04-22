import * as XLSX from "xlsx";
import api from "../connection/api";
import Swal from "sweetalert2";

export const exportValidatedData = (dataToExport, type = 'data', exportFileName, cleanedData = [], invalidData = []) => {
  try {
    const cleanedMap = new Map();
    cleanedData.forEach(item => {
      const rsbsaNumber = (
        item.RSBSASYSTEMGENERATEDNUMBER || 
        item.rsbsa_no || 
        item.rsbsaNumber || 
        item.RSBSA_NO
      )?.toString().trim();
      
      if (rsbsaNumber) {
        const normalizedRecord = {
          RSBSASYSTEMGENERATEDNUMBER: rsbsaNumber,
          FIRSTNAME: item.FIRSTNAME,
          MIDDLENAME: item.MIDDLENAME,
          LASTNAME: item.LASTNAME,
          EXTENSIONNAME: item.EXTENSIONNAME,
          SEX: item.SEX,
          MOTHERMAIDENNAME: item.MOTHERMAIDENNAME,
          STREETNO_PUROKNO: item.STREETNO_PUROKNO,
          CITYMUNICIPALITY: item.CITYMUNICIPALITY || item.CITYMUNICIPALITY,
          PROVINCE: item.PROVINCE,
          DISTRICT: item.DISTRICT,
          REGION: item.REGION,
          MOBILENO: item.MOBILENO,
          PLACEOFBIRTH: item.PLACEOFBIRTH,
          ...item
        };

        const { status, ...cleanRecord } = normalizedRecord;
        cleanedMap.set(rsbsaNumber, cleanRecord);
      }
    });

    let exportData;
    if (type.toLowerCase() === 'invalid' && invalidData.length > 0) {
      exportData = invalidData.map(item => {
        const originalData = item.originalData || item;
        const rsbsaKey = originalData.RSBSASYSTEMGENERATEDNUMBER?.toString().trim();
        const cleanedRecord = rsbsaKey ? cleanedMap.get(rsbsaKey) : null;
        
        const { status, originalIndex, ...cleanOriginal } = originalData;
        
        return {
          ...cleanOriginal,
          ...(cleanedRecord || {}),
        };
      });
    } else {
      exportData = dataToExport.map(item => {
        const originalData = item.originalData || item;
        const rsbsaKey = originalData.RSBSASYSTEMGENERATEDNUMBER?.toString().trim();
        const cleanedRecord = rsbsaKey ? cleanedMap.get(rsbsaKey) : null;
        
        const { status, originalIndex, ...cleanOriginal } = originalData;
        
        return {
          ...cleanOriginal,
          ...(cleanedRecord || {}),
        };
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type);
    
    const filename = `${exportFileName || 'export'}_${type.toLowerCase()}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(workbook, filename);

  } catch (error) {
    console.error('Export failed:', error);
  }
};

export const sendValidationResults = async ( emailData, validData, invalidData, exportFileName, cleanedData = [] ) => {
  try {
    const formData = new FormData();
    const currentDate = new Date().toISOString().slice(0, 10);

    const cleanedMap = new Map();
    cleanedData.forEach((item) => {
      const key = (
        item.RSBSASYSTEMGENERATEDNUMBER ||
        item.rsbsa_no ||
        item.RSBSA_NO
      )?.toString().trim();

      if (key) {
        const { status, ...cleanItem } = item;
        cleanedMap.set(key, cleanItem);
      }
    });

    if (emailData.sendValid && validData.length > 0) {
      const exportValidData = validData.map((item) => {
        const original = item.originalData || item;
        const key = original.RSBSASYSTEMGENERATEDNUMBER?.toString().trim();
        const cleaned = key ? cleanedMap.get(key) : null;

        const { status, originalIndex, ...cleanOriginal } = original;

        return {
          ...cleanOriginal,
          ...(cleaned || {}),
          IsInvalid: false,
          ValidationRemarks: '',
        };
      });

      const validWorksheet = XLSX.utils.json_to_sheet(exportValidData);
      const validWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(validWorkbook, validWorksheet, 'Valid Data');
      const validFile = XLSX.write(validWorkbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const validFileName = `${exportFileName}_valid_${currentDate}.xlsx`;
      formData.append(
        'validFile',
        new Blob([validFile], { type: 'application/octet-stream' }),
        validFileName
      );
      formData.append('validFileName', validFileName);
    }

    if (emailData.sendInvalid && invalidData.length > 0) {
      const exportInvalidData = invalidData.map((item) => {
        const original = item.originalData || item;
        const key = original.RSBSASYSTEMGENERATEDNUMBER?.toString().trim();
        const cleaned = key ? cleanedMap.get(key) : null;

        const { status, originalIndex, ...cleanOriginal } = original;

        return {
          ...cleanOriginal,
          ...(cleaned || {}),
          IsInvalid: true,
          ValidationRemarks: item.Remarks || 'Invalid record',
        };
      });

      const invalidWorksheet = XLSX.utils.json_to_sheet(exportInvalidData);
      const invalidWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(invalidWorkbook, invalidWorksheet, 'Invalid Data');
      const invalidFile = XLSX.write(invalidWorkbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const invalidFileName = `${exportFileName}_invalid_${currentDate}.xlsx`;
      formData.append(
        'invalidFile',
        new Blob([invalidFile], { type: 'application/octet-stream' }),
        invalidFileName
      );
      formData.append('invalidFileName', invalidFileName);
    }

    if (!formData.has('validFile') && !formData.has('invalidFile')) {
      throw new Error('No files selected for sending');
    }

    formData.append('recipient', emailData.recipient);
    formData.append(
      'subject',
      emailData.subject || `${exportFileName} - ${currentDate}`
    );
    formData.append(
      'message',
      emailData.message || 'Please find attached validation results.'
    );

    const swal = Swal.fire({
      title: 'Sending email...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const response = await api.post('/api/email/send-validation-results', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    await swal.close();

    if (response.data.success) {
      await Swal.fire({
        title: 'Success!',
        text: 'Email sent successfully',
        icon: 'success',
        timer: 2000,
      });
      localStorage.setItem('userEmail', emailData.recipient);
      return true;
    }

    throw new Error(response.data.message || 'Failed to send email');
  } catch (error) {
    console.error('Email sending error:', error);
    let errorMessage = error.message || 'Failed to send email';

    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Network error - please check your connection';
    }

    Swal.fire('Error', errorMessage, 'error');
    return false;
  }
};