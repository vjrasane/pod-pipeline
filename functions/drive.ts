import { GoogleApiConfig } from "../config";
import { FileDescriptor } from "../utils";
import { drive_v3, google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import { createReadStream, readFileSync, writeFileSync } from "fs";
import { OAuth2Client } from "google-auth-library";
import { compact } from "lodash/fp";

async function saveCredentials(
  client: OAuth2Client,
  { tokenFile, credentialsFile }: GoogleApiConfig
): Promise<void> {
  const content = readFileSync(credentialsFile, "utf-8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  writeFileSync(tokenFile, payload);
}

const initCredentials = async (config: GoogleApiConfig) => {
  const client = await authenticate({
    scopes: ["https://www.googleapis.com/auth/drive"],
    keyfilePath: config.credentialsFile,
  });
  if (client.credentials) {
    await saveCredentials(client, config);
  }
  return client;
};

async function loadSavedCredentialsIfExist(
  config: GoogleApiConfig
): Promise<OAuth2Client | null> {
  try {
    const content = readFileSync(config.tokenFile, "utf-8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials) as OAuth2Client;
  } catch (err) {
    return null;
  }
}

async function getClient(config: GoogleApiConfig) {
  let client = await loadSavedCredentialsIfExist(config);
  if (client) return client;
  return await initCredentials(config);
}

const initDrive = async (authClient: OAuth2Client) => {
  const drive = google.drive({ version: "v3", auth: authClient });
  return drive;
};

const getFile = async (
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<{ id: string } | undefined> => {
  const q = compact([
    `name = '${name}'`,
    parentId && `'${parentId}' in parents`,
    "trashed = false",
  ]).join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id, name, trashed, parents)",
  });
  const files = res.data.files;

  return files?.find(
    (file) =>
      file.name === name &&
      !file.trashed &&
      (!parentId || file.parents?.some((parent) => parent === parentId))
  ) as any;
};

const getOrCreateFolder = async (
  drive: drive_v3.Drive,
  folderName: string,
  parentId?: string
): Promise<{ id: string }> => {
  const dir = getFile(drive, folderName, parentId);
  if (dir) return dir as any;

  /* @ts-ignore */
  const result: any = await drive.files.create(
    {
      fields: "id, name, trashed, parents",
      /* @ts-ignore */
      resource: {
        name: folderName,
        parents: parentId ? [parentId] : [],
        mimeType: "application/vnd.google-apps.folder",
      },
    },
    {}
  );
  return result.data as any;
};

const getOrCreateFolderPath = async (
  drive: drive_v3.Drive,
  folderPath: string
): Promise<{ id: string }> => {
  const folder = await compact(folderPath.split("/")).reduce(
    (
      acc: Promise<{ id: string } | undefined>,
      curr: string
    ): Promise<{ id: string }> =>
      acc.then((parent) => getOrCreateFolder(drive, curr, parent?.id)),
    Promise.resolve(undefined)
  );
  if (!folder) throw new Error(`Folder '${folderPath}' not created`);
  return folder;
};

const execUpload = async (
  drive: drive_v3.Drive,
  folderPath: string,
  files: FileDescriptor[]
) => {
  const folder = await getOrCreateFolderPath(drive, folderPath);

  const getMimeType = (file: FileDescriptor) => {
    switch (file.ext) {
      case ".png":
        return "image/png";
      case ".jpg":
        return "image/jpeg";
      case ".json":
        return "application/json";
      case ".txt":
      default:
        return "text/plain";
    }
  };

  const uploadFile = async (file: FileDescriptor) => {
    const existing = await getFile(drive, file.base, folder.id);
    if (existing) {
      console.log(`Upload '${file.base}' already exists`);
      return;
    }
    console.log("Uploading " + file.path);
    await drive.files.create({
      fields: "id",
      requestBody: {
        name: file.base,
        mimeType: getMimeType(file),
        parents: [folder.id],
      },
      media: {
        body: createReadStream(file.path),
        mimeType: getMimeType(file),
      },
    });
  };

  await Promise.all(files.map(uploadFile));
  return folder.id;
};

const withDrive =
  (config: GoogleApiConfig) =>
  async <T>(action: (drive: drive_v3.Drive) => Promise<T>): Promise<T> => {
    try {
      const authClient = await getClient(config);
      const drive = await initDrive(authClient);
      return await action(drive);
    } catch (err) {
      console.error(err);
      if ((err as Error).message == "invalid_grant") {
        const authClient = await initCredentials(config);
        const drive = await initDrive(authClient);
        return await action(drive);
      }
      throw err;
    }
  };

export const driveUpload = async (
  folderPath: string,
  files: FileDescriptor[],
  config: GoogleApiConfig
): Promise<string> => {
  return withDrive(config)((drive) => execUpload(drive, folderPath, files));
};

const execShare = async (drive: drive_v3.Drive, folderPath: string) => {
  const folder = await getOrCreateFolderPath(drive, folderPath);
  await drive.permissions.create({
    fileId: folder.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const {
    data: { webViewLink },
  } = await drive.files.get({
    fileId: folder.id,
    fields: "webViewLink",
  });

  if (!webViewLink)
    throw new Error("Could not retrieve webViewLink for folder: " + folderPath);
  return webViewLink;
};

export const driveShare = async (
  folderPath: string,
  config: GoogleApiConfig
): Promise<string> => {
  return withDrive(config)((drive) => execShare(drive, folderPath));
};
