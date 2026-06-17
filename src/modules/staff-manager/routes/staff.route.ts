import express, { Router } from "express";
import {staffController} from "../controllers/staff.controller";
import { validateObjectId } from "../middlewares/validation.middleware"; // Assuming you have this
// import { authenticate, authorize } from "../middlewares/auth.middleware"; // Optional

const router: Router = express.Router();

/**
 * GET /api/staff
 * Get staff list with filters, pagination, and sorting
 * Query parameters:
 *   - page: number (default: 1)
 *   - limit: number (default: 10, max: 100)
 *   - sort_by: string (e.g., "hire_date", "salary_coefficient", "staff_code")
 *   - sort_order: "asc" | "desc" (default: "desc")
 *   - staff_type: string (filter by role)
 *   - branch_id: string (filter by branch)
 *   - search: string (search by staff_code)
 *
 * Example:
 * GET /api/staff?page=1&limit=10&sort_by=hire_date&sort_order=desc&staff_type=manager
 */
router.get("/", async (req, res) => {
    await staffController.getList(req, res);
});

/**
 * GET /api/staff/sort/:sortField
 * Get staff list sorted by a specific field
 * Parameters:
 *   - sortField: string (e.g., "hire_date", "salary_coefficient", "annual_leave_days")
 * Query parameters:
 *   - sort_order: "asc" | "desc" (default: "desc")
 *   - page: number (default: 1)
 *   - limit: number (default: 10)
 *
 * Example:
 * GET /api/staff/sort/salary_coefficient?sort_order=asc&page=1&limit=20
 */
router.get("/sort/:sortField", async (req, res) => {
    await staffController.getListSorted(req, res);
});

/**
 * GET /api/staff/branch/:branchId
 * Get all staff by branch ID
 * Parameters:
 *   - branchId: string (ObjectId)
 *
 * Example:
 * GET /api/staff/branch/507f1f77bcf86cd799439011
 */
router.get("/branch/:branchId", async (req, res) => {
    await staffController.getByBranch(req, res);
});

/**
 * GET /api/staff/code/:staffCode
 * Get staff by staff code
 * Parameters:
 *   - staffCode: string (auto-generated code)
 *
 * Example:
 * GET /api/staff/code/STAFF00001
 */
router.get("/code/:staffCode", async (req, res) => {
    await staffController.getByCode(req, res);
});

/**
 * GET /api/staff/:id
 * Get staff details by ID
 * Parameters:
 *   - id: string (ObjectId)
 *
 * Example:
 * GET /api/staff/507f1f77bcf86cd799439011
 */
router.get("/:id", validateObjectId, async (req, res) => {
    await staffController.getById(req, res);
});

/**
 * PUT /api/staff/:id
 * Update staff information
 * Parameters:
 *   - id: string (ObjectId)
 * Body: IUpdateStaffRequest (partial update)
 *
 * Example:
 * PUT /api/staff/507f1f77bcf86cd799439011
 * Body: { hour_per_week: 35, salary_coefficient: 1.2 }
 */
router.put("/:id", validateObjectId, async (req, res) => {
    await staffController.update(req, res);
});

/**
 * DELETE /api/staff/:id
 * Delete staff
 * Parameters:
 *   - id: string (ObjectId)
 *
 * Example:
 * DELETE /api/staff/507f1f77bcf86cd799439011
 */
router.delete("/:id", validateObjectId, async (req, res) => {
    await staffController.delete(req, res);
});

/**
 * GET /api/staff/:id/leave-summary
 * Get leave days summary for a staff
 * Parameters:
 *   - id: string (ObjectId)
 *
 * Returns:
 * {
 *   annual_leave_days: number,
 *   used_leave_days: number,
 *   available_leave_days: number
 * }
 *
 * Example:
 * GET /api/staff/507f1f77bcf86cd799439011/leave-summary
 */
router.get("/:id/leave-summary", validateObjectId, async (req, res) => {
    await staffController.getLeaveSummary(req, res);
});

/**
 * POST /api/staff/:id/leave
 * Add used leave days for a staff
 * Parameters:
 *   - id: string (ObjectId)
 * Body: { days: number }
 *
 * Example:
 * POST /api/staff/507f1f77bcf86cd799439011/leave
 * Body: { days: 1.5 }
 */
router.post("/:id/leave", validateObjectId, async (req, res) => {
    await staffController.addUsedLeaveDays(req, res);
});

export default router;

/**
 * ==================== ROUTE SUMMARY ====================
 *
 * BASE: /api/staff
 *
 * CREATE:
 *   POST /
 *
 * READ:
 *   GET /                           - List with filters & sorting
 *   GET /sort/:sortField            - List sorted by field
 *   GET /:id                        - Get by ID
 *   GET /code/:staffCode            - Get by staff code
 *   GET /branch/:branchId           - Get by branch
 *   GET /:id/leave-summary          - Get leave summary
 *
 * UPDATE:
 *   PUT /:id                        - Update staff
 *   POST /:id/leave                 - Add used leave days
 *
 * DELETE:
 *   DELETE /:id                     - Delete staff
 *
 * ==================== SORTABLE FIELDS ====================
 *
 * - staff_code
 * - staff_type
 * - hire_date (most common)
 * - hour_per_week
 * - salary_coefficient (most common)
 * - annual_leave_days
 * - used_leave_days
 * - createdAt
 * - updatedAt
 *
 * ==================== EXAMPLE REQUESTS ====================
 *
 * 1. Get paginated staff list sorted by hire date (newest first):
 *    GET /api/staff?page=1&limit=10&sort_by=hire_date&sort_order=desc
 *
 * 2. Get staff sorted by salary (highest first):
 *    GET /api/staff/sort/salary_coefficient?sort_order=desc&page=1&limit=20
 *
 * 3. Filter by staff type and branch, sorted by staff code:
 *    GET /api/staff?staff_type=manager&branch_id=507f1f77bcf86cd799439011&sort_by=staff_code
 *
 * 4. Search staff by code:
 *    GET /api/staff?search=STAFF0001
 *
 * 5. Get all staff of a branch:
 *    GET /api/staff/branch/507f1f77bcf86cd799439011
 *
 * 6. Create new staff:
 *    POST /api/staff
 *    Body: {
 *      user_id: "507f1f77bcf86cd799439011",
 *      staff_type: "manager",
 *      branch_id: "507f1f77bcf86cd799439012",
 *      hire_date: "2024-01-15",
 *      hour_per_week: 40,
 *      salary_coefficient: 1.5,
 *      annual_leave_days: 15,
 *      used_leave_days: 0
 *    }
 *
 * 7. Update staff:
 *    PUT /api/staff/507f1f77bcf86cd799439011
 *    Body: {
 *      hour_per_week: 35,
 *      salary_coefficient: 1.8
 *    }
 *
 * 8. Delete staff:
 *    DELETE /api/staff/507f1f77bcf86cd799439011
 *
 * 9. Get leave days summary:
 *    GET /api/staff/507f1f77bcf86cd799439011/leave-summary
 *
 * 10. Add leave days:
 *     POST /api/staff/507f1f77bcf86cd799439011/leave
 *     Body: { days: 2.5 }
 */