export interface CreateScheduleDTO {
  branch_id: string;
  shift_date: Date;
  start_time: Date;
  end_time: Date;
  shift_status: string;
  max_staff: number;
  algorithm?: string;
  assigned_staff?: string[];
}