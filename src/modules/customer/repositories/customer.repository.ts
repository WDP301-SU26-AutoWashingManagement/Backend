import { BaseRepository } from "@common/repositories/base.repository";
import { Customer, ICustomer } from "../../../models/customer.model";

export class CustomerRepository extends BaseRepository<ICustomer>{
    constructor(){
        super(Customer)
    }
}

export const customerRepository = new CustomerRepository();