#!/bin/bash
set -e

FILENAME="pgdump-aws-lambda.zip"

command_exists () {
    type "$1" &> /dev/null ;
}

if ! command_exists zip ; then
    echo "zip command not found, try: sudo apt-get install zip"
    exit 1
fi
if [ ! -f ./package.json ]; then
    echo "command must be run from the project root directory"
    exit 1
fi


# create a temp directory for our bundle
BUNDLE_DIR=$(mktemp -d)
# copy entire project into BUNDLE_DIR
cp -R * $BUNDLE_DIR/

# remove unnecessary things
pushd $BUNDLE_DIR > /dev/null
echo "cleaning.."
rm -rf node_modules/*
npm install --production --no-progress > /dev/null
rm -rf dist coverage test

# create zip of bundle/
echo "zipping.."
zip -q -r $FILENAME *

# return to project dir
popd > /dev/null

# copy the zip
mkdir -p ./dist
cp $BUNDLE_DIR/$FILENAME ./dist/$FILENAME

echo "successfully created dist/$FILENAME"

# remove bundle/
rm -rf $BUNDLE_DIR
