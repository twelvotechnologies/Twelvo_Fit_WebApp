export type EmploymentStatus = 'active' | 'in_session' | 'on_leave' | 'inactive';

export interface TrainerListItem {
  id: string;
  staffId: string;
  staffCode: string;
  tenantId: number;
  userId: string;
  name: string;
  fullName: string;
  role: string;
  designation: string;
  specialty: string;
  specialization: string | null;
  experienceYears: number;
  certifications: string[];
  email: string;
  phone: string;
  photoUrl: string | null;
  joiningDate: string;
  status: 'ACTIVE' | 'IN_SESSION' | 'ON_LEAVE' | 'INACTIVE';
  employmentStatus: EmploymentStatus;
  baseSalary: number;
  commissionPerSession: number;
  rating: number;
  activeClients: number;
  sessionsThisMonth: number;
}

export interface CreateTrainerDTO {
  fullName: string;
  designation?: string;
  role?: string;
  specialization?: string;
  specialty?: string;
  experienceYears?: number;
  certifications?: string[] | string;
  email?: string;
  phone?: string;
  joiningDate?: string;
  employmentStatus?: EmploymentStatus | string;
  baseSalary?: number;
  commissionPerSession?: number;
}

export interface UpdateTrainerDTO extends Partial<CreateTrainerDTO> {
  employmentStatus?: EmploymentStatus | string;
}

export interface TrainerStatsResponse {
  totalTrainers: number;
  activeOnFloor: number;
  totalClients: number;
  avgRating: number;
}
