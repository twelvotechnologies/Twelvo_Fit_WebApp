import { create } from 'zustand';
import { StaffRole, PaymentStatus } from '../api/types';

interface PayrollUiState {
  roleFilter: StaffRole | 'ALL';
  statusFilter: PaymentStatus | 'ALL';
  monthFilter: string;
  searchQuery: string;
  isRecordPaymentModalOpen: boolean;
  isGiveAdvanceModalOpen: boolean;
  isEditConfigModalOpen: boolean;
  selectedStaffId: string | null;

  setRoleFilter: (role: StaffRole | 'ALL') => void;
  setStatusFilter: (status: PaymentStatus | 'ALL') => void;
  setMonthFilter: (month: string) => void;
  setSearchQuery: (query: string) => void;
  openRecordPayment: (staffId: string) => void;
  closeRecordPayment: () => void;
  openGiveAdvance: (staffId: string) => void;
  closeGiveAdvance: () => void;
  openEditConfig: (staffId: string) => void;
  closeEditConfig: () => void;
}

export const usePayrollUiStore = create<PayrollUiState>((set) => ({
  roleFilter: 'ALL',
  statusFilter: 'ALL',
  monthFilter: 'Current Month',
  searchQuery: '',
  isRecordPaymentModalOpen: false,
  isGiveAdvanceModalOpen: false,
  isEditConfigModalOpen: false,
  selectedStaffId: null,

  setRoleFilter: (role) => set({ roleFilter: role }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setMonthFilter: (month) => set({ monthFilter: month }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  openRecordPayment: (staffId) =>
    set({ isRecordPaymentModalOpen: true, selectedStaffId: staffId }),
  closeRecordPayment: () =>
    set({ isRecordPaymentModalOpen: false, selectedStaffId: null }),

  openGiveAdvance: (staffId) =>
    set({ isGiveAdvanceModalOpen: true, selectedStaffId: staffId }),
  closeGiveAdvance: () =>
    set({ isGiveAdvanceModalOpen: false, selectedStaffId: null }),

  openEditConfig: (staffId) =>
    set({ isEditConfigModalOpen: true, selectedStaffId: staffId }),
  closeEditConfig: () =>
    set({ isEditConfigModalOpen: false, selectedStaffId: null }),
}));
