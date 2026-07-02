import axios from 'axios';
import { Appointment, BookingStatus } from '../../../models/appointment.model';
import { Vehicle } from '../../../models/vehicle.model';
import { iotService } from '@modules/iot/services/iot.service';

const LICENSE_DETECT_API_URL = process.env.LICENSE_DETECT_API_URL || 'http://localhost:8000';

// -------------------------------------------------------
// 1. Fetch biển số từ Python service
// -------------------------------------------------------
async function fetchPlatesFromImage(imageBuffer: Buffer, mimeType: string): Promise<string[]> {
  const FormData = (await import('form-data')).default;
  const form = new FormData();
  form.append('file', imageBuffer, {
    filename: 'frame.jpg',
    contentType: mimeType,
  });

  const response = await axios.post(`${LICENSE_DETECT_API_URL}/detect`, form, {
    headers: form.getHeaders(),
    timeout: 30000, // 30s timeout
  });

  return response.data.plates as string[]; // ["99E1-22268", ...]
}

// -------------------------------------------------------
// 2. Tìm appointment theo biển số + ngày hôm nay
// -------------------------------------------------------
export async function findAppointmentByPlates(plates: string[]) {
  if (plates.length === 0) return null;

  // Tìm vehicle có license_plate khớp với bất kỳ biển nào trong list
  const vehicle = await Vehicle.findOne({
    license_plate: { $in: plates },
  });

  if (!vehicle) return null;
  console.log("plates:", plates);
  console.log("vehicle:", vehicle);
  // Lấy khoảng thời gian hôm nay (00:00:00 → 23:59:59)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Tìm appointment của xe này, hôm nay, đang ở trạng thái confirmed
  const appointment = await Appointment.findOne({
    vehicle_id: vehicle._id,
    scheduled_at: { $gte: startOfDay, $lte: endOfDay },
    booking_status: BookingStatus.CONFIRMED,
  });
  console.log(appointment)
  return appointment ? { appointment, vehicle } : null;
}

// -------------------------------------------------------
// 3. Update trạng thái → checked_in
// -------------------------------------------------------
export async function checkInAppointment(appointmentId: string) {
  return Appointment.findByIdAndUpdate(
    appointmentId,
    {
      booking_status: BookingStatus.CHECKED_IN,
      checkedin_at: new Date(),
    },
    { new: true }
  );
}

// -------------------------------------------------------
// Main function — gọi từ controller
// -------------------------------------------------------
export async function processCheckinFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<{
  success: boolean;
  message: string;
  appointment_id?: string;
  license_plate?: string;
}> {
  // Step 1: Lấy biển số từ Python
  const plates = await fetchPlatesFromImage(imageBuffer, mimeType);

  if (plates.length === 0) {
    return { success: false, message: 'Không nhận diện được biển số.' };
  }

  // Step 2: Tìm appointment
  const result = await findAppointmentByPlates(plates);

  if (!result) {
    return {
      success: false,
      message: 'Không tìm thấy lịch hẹn hôm nay cho biển số này.',
      license_plate: plates[0],
    };
  }

  // Step 3: Update checked_in
  const updated = await checkInAppointment(result.appointment._id.toString());

  if (!updated) {
    return { success: false, message: 'Cập nhật trạng thái thất bại.' };
  }

  iotService.turnOnWaterPump(result.appointment.branch_id.toString());

  return {
    success: true,
    message: 'Check-in thành công.',
    appointment_id: updated._id.toString(),
    license_plate: result.vehicle.license_plate,
  };
}
