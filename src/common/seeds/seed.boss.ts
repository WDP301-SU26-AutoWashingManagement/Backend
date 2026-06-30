import { User } from '../../models/user.model';
import { Boss } from '../../models/boss.model';
import { UserRole } from '../../common/types/enum';

const seedBoss = async () => {
  const email = 'boss@gmail.com';

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log('Boss đã tồn tại, bỏ qua seed.');
    return;
  }

  const bossUser = await User.create({
    full_name: 'Super Boss',
    email,
    user_code: 'US000000',
    password: 'Boss@123456',
    role: UserRole.BOSS,
    is_active: true,
    is_phone_verified: true,
  });

  await Boss.create({ user_id: bossUser._id });

  console.log('Seed boss thành công!');
};

export default seedBoss;