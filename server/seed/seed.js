const mongoose = require('mongoose');
require('dotenv').config();

// 1. Importing all necessary CommonJS models (Matching your image_68beb8.png)
const Category = require('../src/models/Category');
const Skill = require('../src/models/Skill');
const User = require('../src/models/User');
const ClientProfile = require('../src/models/ClientProfile');
const FreelancerProfile = require('../src/models/FreelancerProfile');
const Job = require('../src/models/Job');
const Gig = require('../src/models/Gig');
const Proposal = require('../src/models/Proposal');
const Contract = require('../src/models/Contract');
const Review = require('../src/models/Review');
const Transaction = require('../src/models/Transaction');

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully. Wiping existing data...');

    // 2. Wipe the database to ensure idempotency (F-GEN-05)[cite: 2]
    await Promise.all([
      Transaction.deleteMany({}),
      Review.deleteMany({}),
      Contract.deleteMany({}),
      Proposal.deleteMany({}),
      Gig.deleteMany({}),
      Job.deleteMany({}),
      FreelancerProfile.deleteMany({}),
      ClientProfile.deleteMany({}),
      User.deleteMany({}),
      Skill.deleteMany({}),
      Category.deleteMany({})
    ]);

    console.log('Database wiped. Seeding Categories & Skills...');

    // 3. Seed 8-12 Categories and Skills[cite: 2]
    const createSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const categoryData = [
      { name: 'Web Development', skills: ['React', 'Node.js', 'Express', 'MongoDB', 'HTML/CSS'] },
      { name: 'Mobile Apps', skills: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'Firebase'] },
      { name: 'UI/UX Design', skills: ['Figma', 'Adobe XD', 'Wireframing', 'Prototyping'] },
      { name: 'Graphic Design', skills: ['Photoshop', 'Illustrator', 'Logo Design', 'Branding'] },
      { name: 'Digital Marketing', skills: ['SEO', 'Google Ads', 'Social Media', 'Content Strategy'] },
      { name: 'Data & AI', skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL'] },
      { name: 'Business & Finance', skills: ['Accounting', 'Financial Modeling', 'Business Plan'] },
      { name: 'Admin Support', skills: ['Virtual Assistant', 'Data Entry', 'Customer Support'] }
    ];

    const savedCategories = [];
    for (const cat of categoryData) {
      const newCategory = await Category.create({ name: cat.name, slug: createSlug(cat.name), isFeatured: true });
      savedCategories.push(newCategory);

      const skillsToInsert = cat.skills.map(skill => ({
        name: skill, slug: createSlug(skill), category: newCategory._id
      }));
      await Skill.insertMany(skillsToInsert);
    }

    console.log('Seeding 1 Admin, 10 Clients, and 20 Freelancers...');

    // 4. Seed Users (Mandated credentials)[cite: 2]
    await User.create({
      name: 'Platform Admin', email: 'admin@gcctalent.test', passwordHash: 'Admin123!', role: 'admin', isEmailVerified: true
    });

    const clients = [];
    for (let i = 1; i <= 10; i++) {
      const client = await User.create({
        name: `Client Demo ${i}`, email: `client${i}@gcctalent.test`, passwordHash: 'Password123!', role: 'client', country: 'Bahrain', isEmailVerified: true
      });
      clients.push(client);
      await ClientProfile.create({ user: client._id, companyName: `Demo Company ${i}`, isCompany: true, description: 'Leading agency looking for top talent.' });
    }

    const freelancers = [];
    const gccCountries = ['Bahrain', 'Saudi Arabia', 'UAE', 'Kuwait', 'Oman', 'Qatar']; // GCC mix requirement[cite: 2]

    for (let i = 1; i <= 20; i++) {
      const freelancer = await User.create({
        name: `Freelancer Demo ${i}`, email: `freelancer${i}@gcctalent.test`, passwordHash: 'Password123!', role: 'freelancer', country: gccCountries[i % gccCountries.length], isEmailVerified: true
      });
      freelancers.push(freelancer);
      await FreelancerProfile.create({ user: freelancer._id, headline: 'Expert Professional', bio: 'I deliver high-quality work.', hourlyRate: 30 + i, currency: 'USD', availability: 'full_time' });
    }

    console.log('Seeding 35 Jobs, 20 Gigs, 70 Proposals, and Contracts...');

    // 5. Seed Jobs, Proposals, and Gigs algorithmically[cite: 2]
    const sampleJobTitles = [
      'Full-Stack MERN Vehicle Management App', // Giving your mock data some realistic flavor
      'Community Book Recommendation Web App',
      'Modern E-Commerce Storefront',
      'Digital Media Marketplace App'
    ];

    const jobs = [];
    for (let i = 1; i <= 35; i++) {
      const job = await Job.create({
        client: clients[i % clients.length]._id,
        title: sampleJobTitles[i % sampleJobTitles.length] || `Urgent Project ${i}`,
        description: 'Looking for a reliable developer to build out this platform.',
        category: savedCategories[0]._id, // Assigning to Web Dev for simplicity
        budgetType: 'fixed',
        budgetMin: 500,
        budgetMax: 1500,
        status: i > 25 ? 'completed' : 'open'
      });
      jobs.push(job);
    }

    // Generate 1 Gig for each freelancer (Total: 20 Gigs, satisfies 15+ requirement)[cite: 2]
    for (const freelancer of freelancers) {
      await Gig.create({
        freelancer: freelancer._id,
        title: 'I will build your MERN stack application',
        slug: `mern-app-build-${freelancer._id}`,
        description: 'Full stack development services.',
        category: savedCategories[0]._id,
        tiers: [{ name: 'basic', price: 100, deliveryDays: 3, revisions: 1 }],
        status: 'active'
      });
    }

    // Generate 2 Proposals per Job (Total: 70 Proposals, satisfies 60+ requirement)[cite: 2]
    for (const job of jobs) {
      const f1 = freelancers[Math.floor(Math.random() * freelancers.length)];
      const f2 = freelancers[Math.floor(Math.random() * freelancers.length)];

      if (f1._id !== f2._id) {
        await Proposal.create({ job: job._id, freelancer: f1._id, coverLetter: 'I am perfect for this.', amount: 800, deliveryDays: 14, status: job.status === 'completed' ? 'accepted' : 'pending' });
        await Proposal.create({ job: job._id, freelancer: f2._id, coverLetter: 'I can start today.', amount: 950, deliveryDays: 10, status: job.status === 'completed' ? 'declined' : 'pending' });
      }
    }

    // Generate Contracts and Reviews for the completed jobs (Satisfies 10+ contracts and 20+ reviews)[cite: 2]
    const acceptedProposals = await Proposal.find({ status: 'accepted' }).populate('job');
    for (const prop of acceptedProposals) {
      const contract = await Contract.create({
        client: prop.job.client,
        freelancer: prop.freelancer,
        source: { type: 'job', job: prop.job._id, proposal: prop._id },
        title: prop.job.title,
        totalAmount: prop.amount,
        status: 'completed',
        milestones: [{ title: 'Final Delivery', amount: prop.amount, status: 'approved' }]
      });

      await Review.create({ contract: contract._id, reviewer: contract.client, reviewee: contract.freelancer, rating: 5, comment: 'Great work!' });
      await Review.create({ contract: contract._id, reviewer: contract.freelancer, reviewee: contract.client, rating: 5, comment: 'Great client to work with.' });
    }

    console.log('Seeding completed successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding the database:', error);
    process.exit(1);
  }
};

seedDatabase();