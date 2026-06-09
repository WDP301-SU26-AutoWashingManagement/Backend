import 'dotenv/config';
import { Make } from '../../models/make.model';
import { VehicleModel } from '../../models/vehicleModel.model';
import { VehicleClass } from '../../models/vehicleClass.model';

const seedVehicle = async () => {
  // Seed Classes
  const classes = [
    { class_code: 'SEDAN', class_name: 'Sedan 4-5 chỗ' },
    { class_code: 'SUV', class_name: 'SUV 7 chỗ' },
    { class_code: 'MOTORBIKE', class_name: 'Xe máy' },
  ];
  
  for (const c of classes) {
    await VehicleClass.findOneAndUpdate({ class_code: c.class_code }, c, { upsert: true });
  }

  // Seed Makes
  const makes = ['Honda', 'Toyota', 'Mazda', 'Ford', 'Yamaha'];
  const makeIds: Record<string, string> = {};
  for (const m of makes) {
    const doc = await Make.findOneAndUpdate({ make_name: m }, { make_name: m }, { upsert: true, new: true });
    makeIds[m] = doc._id.toString();
  }

  // Seed Models
  const models = [
    { make: 'Honda', name: 'Civic' },
    { make: 'Honda', name: 'CR-V' },
    { make: 'Honda', name: 'City' },
    { make: 'Toyota', name: 'Vios' },
    { make: 'Toyota', name: 'Fortuner' },
    { make: 'Toyota', name: 'Camry' },
    { make: 'Mazda', name: 'Mazda3' },
    { make: 'Mazda', name: 'CX-5' },
    { make: 'Ford', name: 'Ranger' },
    { make: 'Ford', name: 'Everest' },
    { make: 'Honda', name: 'Air Blade' },
    { make: 'Honda', name: 'Wave Alpha' },
    { make: 'Yamaha', name: 'Exciter' },
    { make: 'Yamaha', name: 'Sirius' },
  ];

  for (const m of models) {
    await VehicleModel.findOneAndUpdate(
      { model_name: m.name }, 
      { make_id: makeIds[m.make], model_name: m.name }, 
      { upsert: true }
    );
  }

  console.log('Seed vehicles data thành công!');
};

export default seedVehicle;
