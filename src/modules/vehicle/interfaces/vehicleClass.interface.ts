export interface ICreateVehicleClass {
  class_name: string;
  description?: string;
}

export interface IUpdateVehicleClass {
  class_name?: string;
  description?: string;
}