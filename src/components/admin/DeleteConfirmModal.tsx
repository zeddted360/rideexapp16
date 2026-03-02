import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface props {
  setShowDeleteModal: React.Dispatch<React.SetStateAction<boolean>>;
  confirmDelete: () => Promise<void>;
  isDeleting: boolean;
};

const DeleteConfirmModal = ({
  setShowDeleteModal,
  confirmDelete,
  isDeleting,
}: props) => {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowDeleteModal(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700"
        onClick={(e:React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Confirm Delete
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to delete this item? This action cannot be
          undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button onClick={() => setShowDeleteModal(false)} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            className="flex items-center bg-red-600 hover:bg-red-700 text-white"
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="animate-spin mr-2" /> : null}
            Delete
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DeleteConfirmModal