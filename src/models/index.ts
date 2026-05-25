/**
 * Register all Mongoose models before routes run.
 * Order matters when schemas reference other models (ref / populate).
 */
import './admin.model';
import './tierConfig.model';
import './user.model';
import './customer.model';
import './staff.model';
import './manager.model';
import './vehicle.model';
import './servicePackage.model';
import './serviceVersion.model';
import './shift.model';
import './staffShift.model';
import './washBooking.model';
import './promotion.model';
import './notification.model';
import './feedback.model';
import './auditLog.model';
