//import * as appsync from '@aws-cdk/aws-appsync';
import * as appsync from '@aws-cdk/aws-appsync-alpha';

import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  aws_cognito as cognito, 
  aws_dynamodb as dynamodb,
  aws_lambda as lambda 
} from 'aws-cdk-lib';


export class CdkTypescriptStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const postsTable = new dynamodb.Table(this, 'PostsTable', {
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      replicationRegions: ['us-east-1']
    });

    const userPool = new cognito.UserPool(this, 'CdkAuth', {
      userPoolName: 'CdkAuth',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      }
    });

    const webClient = userPool.addClient('web', {
      userPoolClientName: 'web',
      authFlows: {
        userPassword: true,
        userSrp: true
      }
    });

    const api = new appsync.GraphqlApi(this, 'ContractsApi', {
      name: 'contracts-api',
      schema: appsync.Schema.fromAsset('schema.api.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool
          }
        },
      },
      
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL
      },
      xrayEnabled: true,
    });

    const postsDS = api.addDynamoDbDataSource('postsTable', postsTable);

    // create post
    postsDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'createPost',
      requestMappingTemplate: appsync.MappingTemplate.fromFile('mapping-template/Mutation.createPost.request.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem()
    });

    new CfnOutput(this, 'GraphQL_URL', { value: api.graphqlUrl });
    
  }
};
