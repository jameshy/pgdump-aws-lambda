#!/bin/bash
set -e

SCRIPT=`readlink -f $0`
SCRIPTPATH=`dirname $SCRIPT`
PROJECTROOT=`readlink -f $SCRIPTPATH/..`
FILENAME="pgdump-aws-lambda.zip"

command_exists () {
    type "$1" &> /dev/null ;
}

if ! command_exists zip ; then
    echo "zip command not found, try: sudo apt-get install zip"
    exit 0
fi


cd $PROJECTROOT

echo "creating bundle.."
# create a temp directory for our bundle
BUNDLE_DIR=$(mktemp -d)
# copy entire app into BUNDLE_DIR
cp -r * $BUNDLE_DIR/

# prune things from BUNDLE_DIR
echo "running npm prune.."
cd $BUNDLE_DIR
# prune dev-dependancies from node_modules
npm prune --production >> /dev/null

rm -rf dist coverage test


# create and empty the dist directory
if [ ! -d $PROJECTROOT/dist ]; then
    mkdir $PROJECTROOT/dist
fi
rm -rf $PROJECTROOT/dist/*

# create zip of bundle/
echo "creating zip.."
zip -q -r $FILENAME *
echo "zip -q -r $FILENAME *"
mv $FILENAME $PROJECTROOT/dist/$FILENAME

echo "successfully created dist/$FILENAME"

# remove bundle/
rm -rf $BUNDLE_DIR


cd $PROJECTROOT
