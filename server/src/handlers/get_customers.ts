import { type Customer, type PaginationInput } from '../schema';

export const getCustomers = async (input?: PaginationInput): Promise<Customer[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all customers for admin management.
    // Should query customers table with pagination, ordered by created_at desc.
    return [];
};