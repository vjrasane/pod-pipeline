import { Config, GoogleApiConfig } from "../config";
import { resolve } from "path";
import { FileDescriptor } from "../utils";
import { drive_v3, google } from "googleapis";
import { authenticate } from "@google-cloud/local-auth";
import { createReadStream, readFileSync, writeFileSync } from "fs";
import { OAuth2Client } from "google-auth-library";
import { compact } from "lodash/fp";

const getOrCreateFolder = async (
  drive: drive_v3.Drive,
  folderName: string,
  parentId?: string
): Promise<{ id: string }> => {
  const q = compact([
    `name = '${folderName}'`,
    parentId && `'${parentId}' in parents`,
    "trashed = false",
  ]).join(" and ");

  const res = await drive.files.list({
    q,
    fields: "files(id, name, trashed, parents)",
  });
  const files = res.data.files;

  const dir = files?.find(
    (file) =>
      file.name === folderName &&
      !file.trashed &&
      (!parentId || file.parents?.some((parent) => parent === parentId))
  );
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

const initDrive = async ({ tokenFile, credentialsFile }: GoogleApiConfig) => {
  async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
    try {
      const content = readFileSync(tokenFile, "utf-8");
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials) as OAuth2Client;
    } catch (err) {
      return null;
    }
  }

  async function saveCredentials(client: OAuth2Client): Promise<void> {
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

  async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
    client = await authenticate({
      scopes: ["https://www.googleapis.com/auth/drive"],
      keyfilePath: credentialsFile,
    });
    if (client.credentials) {
      await saveCredentials(client);
    }
    return client;
  }

  const authClient = await authorize();
  const drive = google.drive({ version: "v3", auth: authClient });
  return drive;
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

type DriveUploadParameters = {
  folderPath: string;
  files: FileDescriptor[];
};

export const driveUpload = async (
  { folderPath, files }: DriveUploadParameters,
  { workDir, ...googleConfig }: GoogleApiConfig & Config
): Promise<string> => {
  const drive = await initDrive(googleConfig);

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
    const filePath = resolve(workDir, file.path);
    console.log("Uploading " + filePath);
    await drive.files.create({
      fields: "id",
      requestBody: {
        name: file.base,
        mimeType: getMimeType(file),
        parents: [folder.id],
      },
      media: {
        body: createReadStream(filePath),
        mimeType: getMimeType(file),
      },
    });
  };

  await Promise.all(files.map(uploadFile));
  return folder.id;
};

type DriveShareParameters = {
  folderPath: string;
};

export const driveShare = async (
  { folderPath }: DriveShareParameters,
  config: GoogleApiConfig
): Promise<string> => {
  const drive = await initDrive(config);
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
