import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // class types
    const yoga = await prisma.classType.upsert({
        where: { id: 'seed-yoga' },
        create: { id: 'seed-yoga', title: 'Yoga', durationMinutes: 60, intensity: 'LOW' },
        update: {},
    });
    const hiit = await prisma.classType.upsert({
        where: { id: 'seed-hiit' },
        create: { id: 'seed-hiit', title: 'HIIT', durationMinutes: 45, intensity: 'HIGH' },
        update: {},
    });

    // coaches
    const coachA = await prisma.coach.upsert({
        where: { id: 'seed-coach-a' },
        create: { id: 'seed-coach-a', name: 'Alice' },
        update: {},
    });
    const coachB = await prisma.coach.upsert({
        where: { id: 'seed-coach-b' },
        create: { id: 'seed-coach-b', name: 'Bob' },
        update: {},
    });

    // sessions today/tomorrow
    const now = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.classSession.createMany({
        data: [
            { classTypeId: yoga.id, coachId: coachA.id, startsAt: now, capacity: 12, price: 12.5 },
            { classTypeId: hiit.id, coachId: coachB.id, startsAt: tomorrow, capacity: 10, price: 15.0 },
        ],
        skipDuplicates: true,
    });
}

main()
    .then(async () => {
        await prisma.$disconnect();
        console.log('Seeded');
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
