import mongoose from 'mongoose';

const LOCAL_URI = 'mongodb://127.0.0.1:27017/staynest';
const ATLAS_URI = 'mongodb+srv://9761700a_db_user:Staynest123@cluster0.eu30h85.mongodb.net/staynest?retryWrites=true&w=majority';

async function migrate() {
    console.log('Connecting to Local and Atlas databases...');
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('Connected to Local MongoDB');

    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('Connected to Atlas MongoDB');

    const collections = await localConn.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections to migrate`);

    for (const col of collections) {
        const colName = col.name;
        if (colName.startsWith('system.')) continue;

        const localCol = localConn.db.collection(colName);
        const atlasCol = atlasConn.db.collection(colName);

        const docs = await localCol.find({}).toArray();
        console.log(`Migrating ${docs.length} documents from "${colName}"...`);

        if (docs.length > 0) {
            for (const doc of docs) {
                await atlasCol.replaceOne({ _id: doc._id }, doc, { upsert: true });
            }
            console.log(`Successfully migrated ${docs.length} docs to Atlas "${colName}"`);
        } else {
            console.log(`Collection "${colName}" is empty, skipping.`);
        }
    }

    console.log('ALL DATA MIGRATED TO ATLAS SUCCESSFULLY!');
    await localConn.close();
    await atlasConn.close();
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
});
