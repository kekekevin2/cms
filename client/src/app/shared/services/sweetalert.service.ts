import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class SweetAlertService {
  success(message: string, title: string = 'Success!') {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'success',
      confirmButtonColor: '#3b82f6',
      confirmButtonText: 'OK',
    });
  }

  error(message: string, title: string = 'Error!') {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'error',
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'OK',
    });
  }

  warning(message: string, title: string = 'Warning!') {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'warning',
      confirmButtonColor: '#f59e0b',
      confirmButtonText: 'OK',
    });
  }

  info(message: string, title: string = 'Info') {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'info',
      confirmButtonColor: '#3b82f6',
      confirmButtonText: 'OK',
    });
  }

  confirm(message: string, title: string = 'Are you sure?') {
    return Swal.fire({
      title: title,
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
    });
  }

  toast(message: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon: icon,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  }
}
