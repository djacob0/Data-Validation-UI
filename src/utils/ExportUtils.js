import * as XLSX from "xlsx";
import api from "../connection/api";
import Swal from "sweetalert2";

export const exportValidatedData = (dataToExport, type, exportFileName) => {
  try {
    if (dataToExport.length === 0) {
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    const filename = `${type.toLowerCase()}_${exportFileName}.xlsx`;
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('Export error:', error);
  }
};

export const sendValidationResults = async (emailData, validData, invalidData, exportFileName) => {
  try {
    const formData = new FormData();
    const baseName = exportFileName || 'validation_results';
    
    if (emailData.sendValid && validData.length > 0) {
      const validWorksheet = XLSX.utils.json_to_sheet(validData);
      const validWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(validWorkbook, validWorksheet, "Valid Data");
      const validFile = XLSX.write(validWorkbook, { bookType: 'xlsx', type: 'array' });
      formData.append('validFile', new Blob([validFile], { type: 'application/octet-stream' }), `${baseName}_valid.xlsx`);
      formData.append('validFileName', `${baseName}_valid.xlsx`);
    }

    if (emailData.sendInvalid && invalidData.length > 0) {
      const invalidWorksheet = XLSX.utils.json_to_sheet(invalidData);
      const invalidWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(invalidWorkbook, invalidWorksheet, "Invalid Data");
      const invalidFile = XLSX.write(invalidWorkbook, { bookType: 'xlsx', type: 'array' });
      formData.append('invalidFile', new Blob([invalidFile], { type: 'application/octet-stream' }), `${baseName}_invalid.xlsx`);
      formData.append('invalidFileName', `${baseName}_invalid.xlsx`);
    }

    formData.append('recipient', emailData.recipient);
    formData.append('subject', emailData.subject);
    formData.append('message', emailData.message);

    Swal.fire({
      title: 'Sending email...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const response = await api.post('/api/email/send-validation-results', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    Swal.close();
    if (response.data.success) {
      Swal.fire({
        title: 'Success!',
        text: 'Email sent successfully',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      localStorage.setItem('userEmail', emailData.recipient);
      return true;
    } else {
      throw new Error(response.data.message || 'Failed to send email');
    }
  } catch (error) {
    Swal.close();
    console.error('Email sending error:', error);
    
    let errorMessage = 'Failed to send email';
    if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Network error - please check your connection';
    } else if (error.response) {
      errorMessage = error.response.data.message || errorMessage;
    }
    
    Swal.fire('Error', errorMessage, 'error');
    return false;
  }
};