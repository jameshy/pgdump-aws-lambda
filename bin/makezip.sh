#!/bin/bash
set -e

FILENAME="pgdump-aws-lambda.zip"

command_exists () {
    type "$1" &> /dev/null ;
}

if ! command_exists zip ; then
    echo "zip command not found, try: sudo apt-get install zip"
    exit 0
fi
if [ ! -f ./package.json ]; then
    echo "command must be run from the project root directory"
    exit 0
fi


# create a temp directory for our bundle
BUNDLE_DIR=$(mktemp -d)
# copy entire project into BUNDLE_DIR
cp -R * $BUNDLE_DIR/

# remove unnecessary things
pushd $BUNDLE_DIR  > /dev/null
# npm prune --production >> /dev/null
rm -rf dist coverage test

# create zip of bundle/
zip -q -r $FILENAME *

# return to project dir
popd > /dev/null

# copy the zip
mkdir -p ./dist
cp $BUNDLE_DIR/$FILENAME ./dist/$FILENAME

echo "successfully created dist/$FILENAME"

# remove bundle/
rm -rf $BUNDLE_DIR
