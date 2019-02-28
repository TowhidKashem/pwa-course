// `posts-store` = db, `posts` = table
const dbPromise = idb.open('posts-store', 1, db => {
  // If table doesn't exist in current db then create it
  // Use this table for the cache
  if (!db.objectStoreNames.contains('posts')) {
    db.createObjectStore('posts', { keyPath: 'id' }); // `keyPath` defined the primary key
  }
  // Use this table for temporarily storing items needed for background sync operations
  if (!db.objectStoreNames.contains('sync-posts')) {
    db.createObjectStore('sync-posts', { keyPath: 'id' });
  }
});

function writeData(table, data) {
  return dbPromise.then(db => {
    let transaction = db.transaction(table, 'readwrite');
    let store = transaction.objectStore(table);
    store.put(data);
    return transaction.complete; // Returns a boolean to tell you if the transaction succeeded or not ala SQL, required for all write operations
  });
}

function readData(table) {
  return dbPromise.then(db => {
    let transaction = db.transaction(table, 'readonly');
    let store = transaction.objectStore(table);
    return store.getAll();
  });
}

// Removes all data for a given table
function deleteAllData(table) {
  return dbPromise.then(db => {
    let transaction = db.transaction(table, 'readwrite');
    let store = transaction.objectStore(table);
    store.clear();
    return transaction.complete;
  });
}

// Removes single item from a given table
function deleteSingleItemData(table, id) {
  dbPromise
    .then(db => {
      let transaction = db.transaction(table, 'readwrite');
      let store = transaction.objectStore(table);
      store.delete(id);
      return transaction.complete;
    })
    .then(() => console.log('Item Deleted!'));
}
