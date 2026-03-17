import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@classitin.dev' },
    update: {},
    create: {
      id: uuid(),
      email: 'teacher@classitin.dev',
      passwordHash,
      displayName: 'Demo Teacher',
      role: 'TEACHER',
    },
  });

  // Create students
  const students = [];
  for (let i = 1; i <= 5; i++) {
    const student = await prisma.user.upsert({
      where: { email: `student${i}@classitin.dev` },
      update: {},
      create: {
        id: uuid(),
        email: `student${i}@classitin.dev`,
        passwordHash,
        displayName: `Student ${i}`,
        role: 'STUDENT',
      },
    });
    students.push(student);
  }

  // Create a room
  const room = await prisma.room.upsert({
    where: { joinCode: 'ABC123' },
    update: {},
    create: {
      id: uuid(),
      name: 'Digital Art 101',
      description: 'Introduction to digital art techniques',
      joinCode: 'ABC123',
      ownerId: teacher.id,
    },
  });

  // Enroll students
  for (const student of students) {
    await prisma.enrollment.upsert({
      where: { userId_roomId: { userId: student.id, roomId: room.id } },
      update: {},
      create: {
        id: uuid(),
        userId: student.id,
        roomId: room.id,
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  Teacher: teacher@classitin.dev / password123`);
  console.log(`  Students: student1-5@classitin.dev / password123`);
  console.log(`  Room: "${room.name}" (join code: ABC123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
