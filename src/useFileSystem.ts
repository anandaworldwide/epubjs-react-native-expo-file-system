import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import type {
  DownloadProgressData,
  FileInfo as ExpoFileInfo,
} from 'expo-file-system/legacy';
import type { FileSystem as FileSystemType } from './types';

export function useFileSystem(): FileSystemType {
  const [file, setFile] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [size, setSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const downloadFile = useCallback((fromUrl: string, toFile: string) => {
    const destPath = FileSystem.documentDirectory + toFile;

    const callback = (downloadProgress: DownloadProgressData) => {
      const currentProgress = Math.round(
        (downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite) *
          100
      );
      setProgress(currentProgress);
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      fromUrl,
      destPath,
      { cache: true },
      callback
    );

    setDownloading(true);
    return downloadResumable
      .downloadAsync()
      .then((value) => {
        if (!value) throw new Error('Download failed');

        if (value.headers['Content-Length']) {
          setSize(Number(value.headers['Content-Length']));
        }

        setSuccess(true);
        setError(null);
        setFile(value.uri);

        return { uri: value.uri, mimeType: value.mimeType };
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else setError('Error downloading file');

        return { uri: null, mimeType: null };
      })
      .finally(() => setDownloading(false));
  }, []);

  const getFileInfo = useCallback(async (fileUri: string) => {
    const result = (await FileSystem.getInfoAsync(fileUri)) as ExpoFileInfo;

    return {
      uri: result.uri,
      exists: result.exists,
      isDirectory: result.isDirectory,
      size: result.exists ? result.size : undefined,
    };
  }, []);

  return {
    file,
    progress,
    downloading,
    size,
    error,
    success,
    documentDirectory: FileSystem.documentDirectory,
    cacheDirectory: FileSystem.cacheDirectory,
    bundleDirectory: FileSystem.bundleDirectory || undefined,
    readAsStringAsync: FileSystem.readAsStringAsync,
    writeAsStringAsync: FileSystem.writeAsStringAsync,
    deleteAsync: FileSystem.deleteAsync,
    downloadFile,
    getFileInfo,
  };
}
