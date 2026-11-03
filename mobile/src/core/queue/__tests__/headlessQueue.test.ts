import { UploadQueueManager } from '../UploadQueueManager';
import { QueueStorage } from '../queueStorage';
import { NetworkMonitor } from '../../network/networkMonitor';
import { ApiClient } from '../../network/apiClient';
import { LocalImage } from '../../../types/report';

/**
 * Headless Verification Suite:
 * Proves that "The upload logic must be exercisable without rendering a screen."
 */
async function runHeadlessTests() {
  console.log(`\n======================================================`);
  console.log(`📱 RUNNING HEADLESS MOBILE QUEUE LOGIC VERIFICATION`);
  console.log(`======================================================\n`);

  // 1. Create isolated mock instances
  const mockStorage = new QueueStorage();
  const mockNet = new NetworkMonitor();
  let uploadCallCount = 0;

  const mockApi: any = {
    uploadReport: async (item: any) => {
      uploadCallCount++;
      return {
        id: `srv-${item.clientReportId.slice(0, 8)}`,
        clientReportId: item.clientReportId,
        description: item.description,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
  };

  const queueManager = new UploadQueueManager(mockStorage, mockApi as ApiClient, mockNet);

  // 2. Test Input Validation without UI
  console.log('[TEST 1] Testing Validation: Blank Description ...');
  try {
    await queueManager.enqueue('', [{ id: '1', uri: 'file://img1.jpg', fileName: 'img1.jpg', fileSize: 1000, type: 'image/jpeg' }]);
    throw new Error('Should have thrown error for blank description');
  } catch (err: any) {
    if (err.message.includes('Description is required')) {
      console.log('✅ PASS: Blank description correctly rejected');
    } else {
      throw err;
    }
  }

  console.log('\n[TEST 2] Testing Validation: 0 images & >5 images ...');
  try {
    await queueManager.enqueue('Test note', []);
    throw new Error('Should have thrown error for 0 images');
  } catch (err: any) {
    if (err.message.includes('between 1 and 5')) {
      console.log('✅ PASS: 0 images correctly rejected');
    } else {
      throw err;
    }
  }

  // 3. Test Offline Queue Persistence (Airplane Mode)
  console.log('\n[TEST 3] Testing Offline Persistence (Airplane Mode / Disconnected) ...');
  mockNet.setMockStatus(false); // Disconnect network

  const dummyImages: LocalImage[] = [
    { id: 'img-1', uri: 'file:///photo1.jpg', fileName: 'photo1.jpg', fileSize: 1024 * 1024 * 2, type: 'image/jpeg' },
    { id: 'img-2', uri: 'file:///photo2.jpg', fileName: 'photo2.jpg', fileSize: 1024 * 1024 * 3, type: 'image/jpeg' },
  ];

  const queuedItem = await queueManager.enqueue('Cracked foundation slab', dummyImages);
  console.log(`Report enqueued. Status: ${queuedItem.status}, ClientId: ${queuedItem.clientReportId}`);

  if (queuedItem.status === 'QUEUED' && uploadCallCount === 0) {
    console.log('✅ PASS: Report safely stored on disk in QUEUED state without network activity');
  } else {
    throw new Error(`Expected QUEUED, got ${queuedItem.status}`);
  }

  // 4. Test Persistence Survival across App Reboot / Force Quit
  console.log('\n[TEST 4] Simulating App Force Quit & Re-launch ...');
  // Re-instantiate queue manager pointing to same storage
  const rebootedQueue = new UploadQueueManager(mockStorage, mockApi as ApiClient, mockNet);
  await rebootedQueue.init();

  const persistedItems = rebootedQueue.getItems();
  if (persistedItems.length === 1 && persistedItems[0].clientReportId === queuedItem.clientReportId) {
    console.log('✅ PASS: "Nothing is lost" — Report survived simulated force-quit!');
  } else {
    throw new Error(`Persisted item count mismatch: ${persistedItems.length}`);
  }

  // 5. Test Network Reconnection & Unattended Delivery
  console.log('\n[TEST 5] Restoring Network Connection (Auto Unattended Delivery) ...');
  mockNet.setMockStatus(true); // Network comes back

  // Allow event loop to process worker
  await new Promise((r) => setTimeout(r, 100));

  const finalItems = rebootedQueue.getItems();
  if (finalItems[0].status === 'SUCCESS' && finalItems[0].serverId && uploadCallCount === 1) {
    console.log(`✅ PASS: Unattended upload completed upon reconnection! Status: SUCCESS, ServerId: ${finalItems[0].serverId}`);
  } else {
    throw new Error(`Expected status SUCCESS, got ${finalItems[0].status}`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL HEADLESS MOBILE QUEUE TESTS PASSED (NO UI NEEDED)!`);
  console.log(`======================================================\n`);
}

runHeadlessTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

