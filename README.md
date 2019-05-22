# gcp-bucket-files-remover

A dockerized nodejs app which deleted files from buckets. Bucket names and folder lists are managed via variables.

## Environment Variables

| Name                                       | Description                                                                                   | Default Value       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------- |
| CONFIG\_GCS\_SERVICE\_ACCOUNT_FILE         | Path to the Service Account JSON file with access to GCS. Can be mounted using /config volume | /config/gcs_sa.json |
| CONFIG\_GCS\_FILES_PATHS                   | Mandatory. PATHS from which files will be deleted. Paths listed by ','                        | --                  |
| CONFIG\_GCS\_BUCKET_NAMES                  | Name of the GCS bucket/buckets to remove files from, buckets listed by ','                    | --                  |
| CONFIG\_GCS\_BUCKET\_NAME\_FILTER          | Name of the GCS bucket/buckets to remove files from with support for wildcards and patterns   | --                  |

One of CONFIG\_GCS\_BUCKET_NAMES or CONFIG\_GCS\_BUCKET\_NAME\_FILTER  should be provided. If none then no files are removed. If both provided
files matching both params will be removed.