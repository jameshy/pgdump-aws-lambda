#!/bin/bash

file="pgdump-aws-lambda.zip"

if [ -f $file ] ; then
    rm $file
fi

zip -x *.git* -r $file .