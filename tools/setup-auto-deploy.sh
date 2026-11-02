#!/bin/bash
# One-time setup: lets GitHub deploy this site to Cloud Run on every push to main.
# No keys are created; GitHub proves who it is with a short-lived token,
# and only the chasesfloorboard/nuvio4dummies repo is allowed in.
set -e
PROJECT=nuvio4dummies
REPO=chasesfloorboard/nuvio4dummies
SA_NAME=github-deployer
SA=$SA_NAME@$PROJECT.iam.gserviceaccount.com

gcloud config set project $PROJECT --quiet
NUM=$(gcloud projects describe $PROJECT --format='value(projectNumber)')

echo "1/4 Turning on the services GitHub needs..."
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com --quiet

echo "2/4 Creating the deploy account..."
gcloud iam service-accounts describe $SA >/dev/null 2>&1 || \
  gcloud iam service-accounts create $SA_NAME --display-name="GitHub deployer" --quiet
for ROLE in roles/run.admin roles/iam.serviceAccountUser roles/cloudbuild.builds.editor \
            roles/artifactregistry.admin roles/storage.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding $PROJECT --member="serviceAccount:$SA" \
    --role=$ROLE --condition=None --quiet >/dev/null
done

echo "3/4 Trusting GitHub for this one repo..."
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub" --quiet
gcloud iam workload-identity-pools providers describe github --location=global \
  --workload-identity-pool=github >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc github --location=global \
    --workload-identity-pool=github --display-name="GitHub" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO'" --quiet

echo "4/4 Linking them..."
gcloud iam service-accounts add-iam-policy-binding $SA --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/$REPO" \
  --quiet >/dev/null

echo
echo "ALL DONE. Auto-deploy is set up. Tell Claude it worked."
